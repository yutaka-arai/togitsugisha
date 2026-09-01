# 時継舎 ホームページプロジェクト

時継舎（とぎつぎしゃ）の静的ホームページ制作プロジェクトです。

## 目的

- 日本の古物紹介ホームページを制作する
- 初期段階では静的サイトとして完成させる
- 将来的に Cloudflare での公開へ移行しやすい構成を保つ

## 初期構成

```text
togitsugisha/
├── index.html
├── items/
│   └── index.html
├── about/
│   └── index.html
├── owner/
│   └── index.html
├── news/
│   └── index.html
├── contact/
│   └── index.html
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   └── images/
│       ├── common/
│       ├── home/
│       └── items/
├── data/
│   ├── items.json
│   └── news.json
├── docs/
│   ├── reference-design.png
│   ├── sitemap.md
│   └── style-guide.md
├── .gitignore
└── README.md
```

## 方針

- HTML はページごとにディレクトリ分割し、分かりやすい URL を維持する
- CSS は当面 `assets/css/style.css` の 1 ファイルで管理する
- JavaScript は当面 `assets/js/main.js` の 1 ファイルで管理する
- 参考原本は変更せず、作業用コピーを `docs/reference-design.png` に置く

## 参考資料

- サイトマップ: `docs/sitemap.md`
- デザイン仕様: `docs/style-guide.md`
- 参考デザイン作業用コピー: `docs/reference-design.png`

## 次段階

1. ホームページのワイヤー整理
2. 共通レイアウトの HTML 実装
3. `style.css` で配色、余白、タイポグラフィを定義
4. ホームページを優先実装
5. 下層ページへ展開
