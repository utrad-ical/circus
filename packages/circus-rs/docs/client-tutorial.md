---
title: Getting Started
---

# Getting Started

## 描画の基本

DynamicImageSource と Viewer を作成し、画面内に断面図を描画させてみましょう。  
作成した ImageSource, Viewer を関連付けるために Composition を利用していることに注意して下さい。

javascript
```js
var series = 'your-series-id';
var server = 'https://your-rs-server/';
const src = new circusrs.DynamicImageSource({ series, server });
const viewer = new circusrs.Viewer( document.getElementById('viewer') );

const comp = new circusrs.Composition();
comp.setImageSource(src);
viewer.setComposition(comp);
```

html

```html
...
<body>
	<div id="viewer"></div>
</body>
...

```

## 描画設定の取得

断面図の描画が出来ました。  
断面図の描画は、DynamicImageSource へ [描画設定][ViewState] を渡して実行されています。  
初期状態では、[ImageSourceが提供する初期の描画設定][initialState]を用います。これは単純なオブジェクトです。  
`DynamicImageSource`を含め、`ImageSource`には非同期処理を含んでいることがあります。  
`ImageSource.ready()`を使って、描画準備が完了した後に[描画設定][ViewState]を取得していることに注意して下さい。

[initialState]: #initialState
[ViewState]: #ViewState

```js
src.ready().then(() => {
	const state = viewer.getState();
	console.log( JSON.stringify(state,null,'  ') );
});
```

```js
var section = {
  "window": { // ウィンドウ設定
    "level": 60, // ウィンドウレベル
    "width": 400 // ウィンドウ幅
  },
  "section": { // ボリュームに対する断面の定義
    "origin": [ 0, 0, 209.5 ], // 断面の起点
    "xAxis": [ 293, 0, 0 ], // 断面のx軸ベクトルの定義
    "yAxis": [ 0, 293, 0 ] // 断面のy軸方の定義
  }
}
```

## 描画設定の変更

[描画設定][ViewState]を変更するコードを加えて別の描画を行ってみましょう。
[`DynamicImageSource`][DynamicImageSource]の初期描画設定はaxialですので、coronalへ変えてみます。　　
(ボリュームに対する断面の定義の操作は[`SectionUtil`][SectionUtil]を利用すると便利です)

javascript

```js

src.ready().then(() => {
	const state = viewer.getState();

	const [ width, height, depth ] = src.mmDim();

	state.section.origin = [0, height / 2, 0];
	state.section.xAxis = [width, 0, 0];
	state.section.yAxis = [0, 0, depth];

	viewer.setState( state );
} );
```

通常、[描画設定][ViewState]を変更するには、次の手順で行います。

0. Viewer.getState() で現在の描画設定を取得
0. 取得した描画設定を加工
0. Viewer.setState() で描画設定を更新

自身の再描画を含む様々な処理は、Viewer.setState() をきっかけとして発火します。
