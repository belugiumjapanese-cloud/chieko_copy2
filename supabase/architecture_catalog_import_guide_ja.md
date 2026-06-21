# 建築・ランドマーク台帳の入力手順

## 最初に実行するSQL

Supabase SQL Editorで `architecture_landmark_search.sql` を1回実行します。既存の投稿、Folder、Profile、Communityは削除されません。

## 3人での分担

1. 担当A: `architects` を入力する。英語名、日本語名、別名を確認する。
2. 担当B: `landmarks` の基本情報を入力する。名称、住所、設計者、竣工年を確認する。
3. 担当C: 緯度経度、カバー画像、表記ゆれを確認し、アプリの検索でテストする。

同じ人物・建築を重複登録しないため、`catalog_key` を必ず決めます。半角英小文字、数字、ハイフンを推奨します。

例:

- 建築家: `le-corbusier`
- 建築: `villa-savoye-poissy`

## architectsテーブル

| 列 | 必須 | 例 |
| --- | --- | --- |
| catalog_key | 推奨 | `le-corbusier` |
| name_en | 必須 | `Le Corbusier` |
| name_ja | 任意 | `ル・コルビュジエ` |
| aliases | 任意 | `{"Le Corbu","Charles-Edouard Jeanneret"}` |
| bio | 任意 | 短い説明 |
| website_url | 任意 | 情報源URL |

`architects` を先に入力します。Supabase Table Editorで作成された `id` をコピーし、建築側の `architect_id` に使います。

## landmarksテーブル

| 列 | 必須 | 例 |
| --- | --- | --- |
| catalog_key | 推奨 | `villa-savoye-poissy` |
| category_id | 任意 | ArchitectureのUUID |
| architect_id | 任意 | Le CorbusierのUUID |
| name_en | 必須 | `Villa Savoye` |
| name_ja | 任意 | `サヴォア邸` |
| aliases | 任意 | `{"Villa Savoye Poissy","サボア邸"}` |
| description | 任意 | 建築の短い説明 |
| address | 推奨 | `82 Rue de Villiers, 78300 Poissy, France` |
| latitude | 必須 | `48.9245` |
| longitude | 必須 | `2.0285` |
| completion_year | 任意 | `1931` |
| cover_image_url | 任意 | 公開画像URL |
| source_url | 任意 | 情報源URL |
| status | 必須 | `published` |

## 表記ルール

- `name_en` は公式または一般的な英語表記にする。
- `name_ja` は日本語で一般的な名称にする。
- 旧称、通称、綴り違いは `aliases` に入れる。
- 建築家の日本語名、英語名、別名のどれでも検索できる。
- 緯度経度は建物の中心付近を小数で入力する。
- 未確認情報は無理に埋めず、`status = 'draft'` にする。

## 投稿との関係

アプリでユーザーが近くの建築候補を選ぶと、投稿と建築が `landmark_posts` で接続されます。1つの建築に複数ユーザーの写真が集まり、建築ページで # ごとに閲覧できます。

## CSVで作業する場合

SupabaseのCSV Importを使えます。ただし、`architect_id` と `category_id` はUUIDです。先に `architects` と `content_categories` を登録してIDを共有シートへ貼り、その後 `landmarks` を読み込んでください。

