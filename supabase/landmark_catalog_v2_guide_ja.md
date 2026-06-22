# 建築カタログ v2 入力ガイド

## どの情報をどこへ入れるか

| テーブル | 1行が表すもの | 主な列 |
| --- | --- | --- |
| `architects` | 設計者1人 | `catalog_key`, `name_en`, `name_ja`, `aliases` |
| `landmarks` | 建築・場所1件 | `catalog_key`, `name_en`, `name_ja`, `address`, `latitude`, `longitude`, `source_url` |
| `landmark_names` | 建築名1個 | `landmark_id`, `name`, `locale`, `name_type` |
| `landmark_architects` | 建築と設計者の組み合わせ1件 | `landmark_id`, `architect_id`, `role`, `sort_order` |
| `landmark_keywords` | 検索関連語1個 | `landmark_id`, `keyword`, `locale`, `keyword_type` |
| `posts` | ユーザーが投稿した画像・PIN1件 | アプリから自動作成 |
| `landmark_posts` | 投稿と建築の紐付け1件 | アプリから自動作成 |

`landmark_names`、`landmark_architects`、`landmark_keywords`は、同じ`landmark_id`で行を追加すれば件数制限なく増やせます。

## 最初に実行するSQL

先に`architecture_landmark_search.sql`が成功済みであることを確認し、その後`landmark_catalog_v2_bauhaus.sql`をSupabase SQL Editorで全文実行します。以下がまとめて作成されます。

- 複数名称・複数設計者・関連語のテーブル
- アプリが読む`app_landmark_search`ビュー
- Walter Gropiusの設計者レコード
- Bauhaus Dessauの建築レコード
- 日本語・英語・ドイツ語の名称
- 「バウハウス」「モダニズム」などの検索語

SQLの最後のSELECTで、Bauhaus Dessauの1行が返れば成功です。

## Bauhaus Dessauの入力例

このSQLでは次のデータが登録されます。Table Editorで確認するときの見本にしてください。

- `architects`: `walter-gropius` / Walter Gropius / ヴァルター・グロピウス
- `landmarks`: `bauhaus-dessau-building` / Bauhaus Dessau / バウハウス デッサウ校
- 住所: Gropiusallee 38, 06846 Dessau-Roßlau, Germany
- 座標: 緯度`51.8393593`、経度`12.2273397`
- `landmark_names`: 英語・日本語・ドイツ語の名称を1名称1行
- `landmark_keywords`: バウハウス、Bauhaus、モダニズム、Modernismを1語1行
- `landmark_architects`: Bauhaus DessauとWalter GropiusのUUIDを1行で紐付け

`landmarks`と`architects`のUUIDは自動発行されます。UUIDを先に自分で作る必要はありません。

## 2件目からの追加方法

新規追加には`landmark_insert_template.sql`を使います。ファイル上部の「ここだけ編集」にある値だけを置き換え、Supabase SQL Editorで全文実行してください。

このテンプレートは以下を自動で行います。

- 設計者と建築のUUID発行
- `architects`と`landmarks`の作成または更新
- `landmark_architects`の紐付け
- 英語・日本語の主名称の自動登録
- 追加名称と検索関連語の件数無制限登録
- 同じ`catalog_key`で再実行した場合の重複防止

設計者、追加名称、関連語はJSON配列へ行を増やすだけです。

通常の文章欄で`'`を使う場合は、SQLでは`''`と2個続けて書きます。JSON配列内の文章はダブルクォートで囲みます。

注意: 同じ`catalog_key`で再実行すると、その建築の設計者・名称・関連語はテンプレートに書かれた最新内容へ同期されます。

Table Editorへ個別に手入力する場合は、次の順番です。

1. `architects`へ設計者をupsertする。
2. `landmarks`へ建築をupsertする。
3. `landmark_architects`で建築と設計者を紐付ける。
4. `landmark_names`へ別名・多言語名を追加する。
5. `landmark_keywords`へ検索語を1語1行で追加する。

`catalog_key`は英小文字とハイフンで一意にします。例: `bauhaus-dessau-building`, `walter-gropius`。

## 画像の扱い

建築カタログ自体の`cover_image_url`は空でも構いません。ユーザー投稿がある場合、アプリは次の順でトップ画像を選びます。

1. `landmarks.cover_image_url`
2. `#外観`、`#facade`、`#exterior`付きの投稿画像
3. その建築に紐づく最初の投稿画像
4. プレースホルダー

建築PINから「画像を投稿」を押すと、投稿は`posts`へ入り、`landmark_posts`へ自動で紐付きます。
