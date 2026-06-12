import { addDoc, collection, doc, getDocs, increment, orderBy, query, serverTimestamp, setDoc, writeBatch, Timestamp } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'
import { compressImageForUpload } from './photo'
import type { DropDoc, DropFolder, NewDropInput } from './types'

function userCollection(userId: string, child: 'drops' | 'folders') {
  return collection(db, 'users', userId, child)
}

function timestampToDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : value
}

export async function listFolders(userId: string): Promise<DropFolder[]> {
  const snapshot = await getDocs(query(userCollection(userId, 'folders'), orderBy('createdAt', 'desc')))

  return snapshot.docs.map((folderDoc) => {
    const data = folderDoc.data() as Omit<DropFolder, 'id'>
    return {
      id: folderDoc.id,
      name: data.name,
      createdAt: timestampToDate(data.createdAt),
      dropCount: data.dropCount ?? 0,
      latestImageUrl: data.latestImageUrl ?? null,
    }
  })
}

export async function createFolder(userId: string, name: string) {
  const folderRef = await addDoc(userCollection(userId, 'folders'), {
    name: name.trim(),
    createdAt: serverTimestamp(),
    dropCount: 0,
  })

  return folderRef.id
}

export async function listDrops(userId: string): Promise<DropDoc[]> {
  const snapshot = await getDocs(query(userCollection(userId, 'drops'), orderBy('createdAt', 'desc')))

  return snapshot.docs.map((dropDoc) => {
    const data = dropDoc.data() as Omit<DropDoc, 'id'>
    return {
      id: dropDoc.id,
      imageUrl: data.imageUrl,
      lat: data.lat,
      lng: data.lng,
      placeName: data.placeName,
      address: data.address,
      folderId: data.folderId,
      caption: data.caption ?? '',
      takenAt: timestampToDate(data.takenAt),
      createdAt: timestampToDate(data.createdAt),
      isPublic: Boolean(data.isPublic),
    }
  })
}

export async function createDropWithImage(userId: string, input: NewDropInput) {
  const dropRef = doc(userCollection(userId, 'drops'))
  const compressedImage = await compressImageForUpload(input.imageFile)
  const imagePath = `users/${userId}/drops/${dropRef.id}/${Date.now()}-${input.imageFile.name}`
  const imageRef = ref(storage, imagePath)

  await uploadBytes(imageRef, compressedImage, {
    contentType: compressedImage.type || input.imageFile.type,
  })

  const imageUrl = await getDownloadURL(imageRef)
  const folderRef = doc(db, 'users', userId, 'folders', input.folderId)
  const batch = writeBatch(db)
  const takenAt = input.takenAt ? Timestamp.fromDate(input.takenAt) : serverTimestamp()

  batch.set(dropRef, {
    imageUrl,
    lat: input.coordinates.lat,
    lng: input.coordinates.lng,
    placeName: input.placeName,
    address: input.address,
    folderId: input.folderId,
    caption: input.caption ?? '',
    takenAt,
    createdAt: serverTimestamp(),
    isPublic: input.isPublic ?? true,
  })
  batch.set(
    folderRef,
    {
      dropCount: increment(1),
      latestImageUrl: imageUrl,
    },
    { merge: true },
  )

  await batch.commit()

  return dropRef.id
}
