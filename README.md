# earth-moon

地球と月のダンス ― 北極の真上から見た、地球と月。

写真を貼った地球と月が、太陽の光を受けて回る様子を見られる1ページのサイトです。
JavaScript と Canvas だけで動作し、外部ライブラリは不要です。
姉妹編：[moon-age-calendar](https://github.com/fmseitai-coder/moon-age-calendar)（月齢カレンダー）、[earth-seasons](https://github.com/fmseitai-coder/earth-seasons)（地球の傾きと四季）

公開ページ: https://fujitamario.com/molt/earth-moon/

## 内容

- 北極の真上から見た、地球の自転（約24時間）と、月の公転（約27.3日）
- 月は、いつも同じ面を地球に向ける（月の縁の金の点が、地球側の面の中心）
- 月の位置は、いまの本物の位置から始まる（月齢・月の形・月までの距離も表示）
- 速さは、1時間/秒〜3日/秒で切り替えられる

縮尺は実際と異なります（見やすいように、月を近く、大きく描いています）。

## ファイル構成

| ファイル | 内容 |
|---|---|
| `index.html` | ページ本体 |
| `style.css` | スタイル |
| `astro.js` | 月の位置の計算（Meeus の簡略式） |
| `app.js` | 写真を球に貼って描く／画面の更新 |
| `img/earth.jpg` | 地球の写真（2048×1024） |
| `img/moon.jpg` | 月の地図（2048×1024） |

## 使い方

サーバーに置くか、ローカルサーバーで開いてください。

```
python -m http.server 8125
```

`index.html` をダブルクリックで開くと、ブラウザの安全のしくみで、写真を読み込めません。

## クレジット

- 地球: NASA Visible Earth, Blue Marble: Next Generation（2004年10月）
- 月: NASA Scientific Visualization Studio, CGI Moon Kit（LRO の観測データ）

## ライセンス

MIT License
