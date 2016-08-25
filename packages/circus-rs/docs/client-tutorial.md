---
title: Getting Started
---

# Getting Started

## 描画の基本

この最低限のサンプルでは、 DynamicImageSource と Viewer を作成し、画面内に断面図を描画させます。

JavaScript

```js
const series = 'your-series-id';
const server = 'https://your-rs-server/';

// Create a new ImageSource
const src = new circusrs.DynamicImageSource({ series, server });

// Assign your ImageSource to a new Composition
const comp = new circusrs.Composition();
comp.setImageSource(src);

// Assign the composition to a new Viewer
const viewer = new circusrs.Viewer(
    document.getElementById('viewer')
);
viewer.setComposition(comp);
```

HTML

```html
...
<body>
    <div id="viewer"></div>
</body>
...
```

実行例：

［画像］

ImageSource が、これから表示しようとしている画像そのものを表しています。作成した ImageSource と Viewer を関連付けるために Composition クラスを利用していることに注意して下さい。この例では Composition は冗長に思えるでしょうが、 Composition は ImageSource に複数の Annotation を関連づけるために使用します。

## 描画設定の取得

ひとまず断面図の描画が出来ました。

Viewer の内部では、断面図の描画は、 DynamicImageSource のインスタンスに **描画設定 (ViewState)** を渡すことで実行されています。描画設定とは、 ImageSource をどのような条件で表示するのかを表すデータであり、これは単純なオブジェクト（クラスではない）です。具体的には、最初の画像がロードされて表示され終わった時点で、描画設定には以下のようなデータが含まれています。

```js
var viewState = {
    "window": { // ウィンドウ設定
        "level": 60, // ウィンドウレベル
        "width": 400 // ウィンドウ幅
    },
    "section": { // ボリュームに対するMPR断面の定義
        "origin": [ 0, 0, 209.5 ], // 起点（断面左上の座標）
        "xAxis": [ 293, 0, 0 ], // 断面のx軸ベクトルの定義
        "yAxis": [ 0, 293, 0 ] // 断面のy軸方の定義
    }
}
```

この場合は xAxis がボリューム座標系での +x 方向、 yAxis がボリューム座標系での +y 方向を向いていることから、いわゆる axial 画像を表示していることがわかります。

`DynamicImageSource` を含め、`ImageSource` は原則として非同期的に画像を描画します。また、クラスを作成した時点ですぐに描画命令を受け付けられるわけではなく、HTTPを経由した画像データのローディングなど、準備が必要です。

準備が完了したかどうかは `ImageSource.ready()` で得られる Promise を使って判定します。これが resolve するまでは、有効な描画設定自体も存在しません。

```js
src.ready().then(() => {
    const state = viewer.getState();
    console.log(JSON.stringify(state, null, '  '));
});
```

// TODO: イベントベースに書き換え

## 描画設定の変更

描画設定を変更するコードを加えて別の角度からの画像を表示してみましょう。

DynamicImageSource は、初期描画設定は

（ボリュームに対する断面の定義の操作は `SectionUtil` を利用すると便利です）

JavaScript

```js
src.ready().then(() => {
    // getState() returns the current ViewState
    const state = viewer.getState();

    // mmDim returns the size of the volume in mm
    const [width, height, depth] = src.mmDim();

    // Modify the ViewState...
    state.section.origin = [0, height / 2, 0];
    state.section.xAxis = [width, 0, 0];
    state.section.yAxis = [0, 0, depth];

    // ...and assign it again to the Viewer
    viewer.setState(state);
} );
```

通常、描画設定を変更するには、次の手順で行います。

0. Viewer#getState() で現在の描画設定を取得
0. 取得した描画設定を加工
0. Viewer#setState() で描画設定を更新

`setState()` は呼ばれた瞬間にビューアの再描画を行うのではなく、次のブラウザのイベントループ終了後の時点で再描画が行われるように描画の予約を行います。必要に応じて `setState()` は複数回呼び出すことができ、それによるフレームレート低下などのパフォーマンスへの悪影響はほとんどありません。
{:.alert .alert-info}
