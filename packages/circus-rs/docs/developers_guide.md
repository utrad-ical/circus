CIRCUS RS: Developer's Guide
==================================
# CIRCUS RS の基本構成
### ImageSource
ボリュームへアクセスし、断面図をキャンバスへ描画します。  
ボリュームへのアクセス方法別に、複数の実装が存在します。

| class | データの生成方法 |
|-|-|
| `DynamicImageSource`		| 描画の都度サーバーから断面図データを取得して描画します |
| `RawVolumeImageSource`	| はじめにサーバーからボリュームデータを取得した後、クライアント側で断面図データを生成して描画します |
| `HybridImageSource`		| 基本的な動きは `RawVolumeImageSource` と同じですが、ボリュームを取得するまでの間 `DynamicImageSource` として動作する点が異なります |

### Annotation
注記をキャンバスへ描画します。  
### Viewer  
ボリュームの描画設定を管理したり ImageSource や Annotation へ描画の依頼を出します。  
キャンバスで発生したイベントを適切に Tool へ伝搬させます。
### Tool
Viewerの描画設定を変更したり、Annotationの作成を行ったりします。
### Composition
各種オブジェクトのコンテナです。  
ImageSource と Viewer を関連させるハブの役割を担います。  

# Getting Started
### 描画の基本
DynamicImageSource と Viewer を作成し、画面内に断面図を描画させてみましょう。  
作成した ImageSource , Viewer を関連付けるために Composition を利用していることに注意して下さい。

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

### 描画設定の取得
断面図の描画が出来ました。  
断面図の描画は、DynamicImageSource へ [描画設定][ViewState] を渡して実行されています。  
初期状態では、[ImageSourceが提供する初期の描画設定][initialState]を用います。これは単純なオブジェクトです。  
`DynamicImageSource`を含め、`ImageSource`には非同期処理を含んでいることがあります。  
`ImageSource.ready()`を使って、描画準備が完了した後に[描画設定][ViewState]を取得していることに注意して下さい。

[initialState]: #initialState
[ViewState]: #ViewState

```js
...
src.ready().then( () => {
	const state = viewer.getState();
	console.log( JSON.stringify(state,null,'  ') );
} );
```

```js
{
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

### 描画設定の変更
[描画設定][ViewState]を変更するコードを加えて別の描画を行ってみましょう。
[`DynamicImageSource`][DynamicImageSource]の初期描画設定はaxialですので、coronalへ変えてみます。　　
(ボリュームに対する断面の定義の操作は[`SectionUtil`][SectionUtil]を利用すると便利です)

javascript
```js

...

src.ready().then( () => {
	
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

### ツール
マウス操作によって断面図のページを切り替えたり、拡大したり縮小したりしながら閲覧したいと思うことがあります。  
これらを実現するものが[`Tool`][Tool]です。  
[Tool]: #Tool
Tool は ビューア上のマウスイベントに対するハンドラの集まりです。  
渡されるイベントには、`viewer`プロパティをはじめ、幾つかの拡張情報が含まれています。

Toolクラスを定義する場合には、`ViewerEventTarget`インターフェイスを実装する必要があることに注意して下さい。

```
interface ViewerEventTarget {
	mouseUpHandler: (viewerEvent: ViewerEvent) => any;
	mouseDownHandler: (viewerEvent: ViewerEvent) =>  any;
	mouseMoveHandler: (viewerEvent: ViewerEvent) =>  any;
	dragStartHandler: (viewerEvent: ViewerEvent) =>  any;
	dragHandler: (viewerEvent: ViewerEvent) =>  any;
	dragEndHandler: (viewerEvent: ViewerEvent) =>  any;
	wheelHandler: (viewerEvent: ViewerEvent) =>  any;
}
```

#### クリックしたらアラートを出すツールクラスの定義　(実は mouseClick が拾えないので mouseUp で代替)
実際に独自のToolを利用するまでは以下の手順となります。
0. Toolクラスの定義
0. 作成したToolクラスの登録 `registerTool`
0. Toolのアクティブ化


```javascript
...

class MyCustomTool {
	mouseUpHandler(viewerEvent) {
		alert('Hello CIRCUS RS Tool!');
	};
	mouseDownHandler(viewerEvent) {};
	mouseMoveHandler(viewerEvent) {};
	dragStartHandler(viewerEvent) {};
	dragHandler(viewerEvent) {};
	dragEndHandler(viewerEvent) {};
	wheelHandler(viewerEvent) {};
}
circusrs.registerTool('mytool', MyCustomTool);
viewer.setActiveTool('mytool');
```

ビューアをクリックするとメッセージが表示されます。

#### マウスホイールに応じて、表示する断面図の位置を変更する機能を追加
`wheelHandler`を変更して表示する断面図の位置を変更する機能を追加してみます。  
イベントハンドラに渡されるイベントデータの中で、重要なのは、`original`プロパティと`viewer`プロパティです。  
* `original`プロパティ  
Viewerによってラップされている CanvasDomElement が受け取った生のイベントが格納されます。
* `viewer`プロパティ  
イベントの発火元となったViewer

Viewerが取得出来れば、`getState()`,`setState()`を利用して[描画設定][ViewState]の変更をするだけです。

```javascript
...

class MyCustomTool {
	...
	wheelHandler(viewerEvent) {
		const viewer = viewerEvent.viewer;
		const state = viewer.getState();
		const step = -Math.sign( viewerEvent.original.deltaY );
		const src = viewer.composition.imageSource;
		const voxelSize = src.voxelSize();
		state.section = circusrs.orientationAwareTranslation(state.section, voxelSize, step);
		viewer.setState(state);
	};
}
...
```

### 最初から用意されているToolクラス

CIRCUS RS にはいくつかのツールクラスが予め用意されています。
これらは登録( `registerTool` )をしなくても利用できます。  
(初期化時に自動で登録されています)

| class | 用途 | ツール名 |
|-|-|-|
| HandTool | 手のひらツール | hand |
| WindowTool | ウィンドウの設定変更 | window |
| ZoomTool | 拡大・縮小 | zoom |
| CelestialRotate | 天球回転 | cerestialRotate |

### 複数のツールを登録して、切り替えて使う
独自に作成したツールや用意されているToolを複数登録し、`Viewer.setActiveTool()`で切り替えて利用することが出来ます。  
以下の例では、いくつかのToolを登録し、それらを切替えるための select タグの生成を行います。

```javascript

...

circusrs.registerTool('mytool', MyCustomTool);
// circusrs.registerTool('hand', circusrs.HandTool); // 不要!
// circusrs.registerTool('zoom', circusrs.ZoomTool); // 不要!
// circusrs.registerTool('window', circusrs.WindowTool); // 不要!

const toolList = [ 'mytool', 'hand', 'zoom', 'window' ];
const toolSelector = document.createElement('select');
toolList.forEach( (toolName) => {
	const option = document.createElement('option');
	option.appendChild(
		document.createTextNode( toolName )
	);
	toolSelector.appendChild(option);
} );
toolSelector.addEventListener('change', function(){
	viewer.setActiveTool( toolList[this.selectedIndex] );
} );
document.getElementById('tool-selector').appendChild( toolSelector );
viewer.setActiveTool( toolList[0] );
```

```html
	<div id="tool-selector"></div>
	<div id="viewer"></div>
```

### ツールバー
selectタグだとツールを切替えるために2回もクリックしなくてはいけません。  
CIRCUS RS には1回のクリックでツール切替えを行うことができるツールバーを容易に作成するヘルパがあります。  

```javascript

...

circusrs.registerTool('mytool', MyCustomTool);
// circusrs.registerTool('hand', circusrs.HandTool);
// circusrs.registerTool('zoom', circusrs.ZoomTool);
// circusrs.registerTool('window', circusrs.WindowTool);
viewer.setActiveTool( 'mytool' );

const toolbar = circusrs.createToolbar(
	document.getElementById('tool-selector'),
	['mytool', 'hand', 'zoom', 'window']
);
toolbar.bindViewer(viewer);

```

```html
	<div id="tool-selector"></div>
	<div id="viewer"></div>
```

独自ツールのボタンを調整するにはツール名に応じたクラスを定義して下さい。

.rs-icon-\[tool name\]:before

```css
<style>
.rs-icon-mytool:before {
    content: 'C';
}
</style>
```

## Annotation について
* データの保持  
* 描画方法の定義  
* じつはToolより先にイベントのかっさらい

## 複数のビューアの利用について

## 独自のImageSourceを実装する
`ImageSource`の実装は、[描画設定][ViewState]を元に、キャンバスの描画を行う処理(`draw`)を提供します。  
ここにinterface

* Promise を返すことに注意して
* 連続描画は対応されているよ

[DynamicImageSource]: #DynamicImageSource
[SectionUtil]: #SectionUtil
