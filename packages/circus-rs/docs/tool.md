---
title: Working with Tools
---

# Working with Tools

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
