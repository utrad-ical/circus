---
title: Working with Annotations
---

# Working with Annotations

アノテーション（注記）は ImageSource で表される画像に付随する様々な情報を表します。アノテーションとは、例えば以下のようなものです。

- 病変をマークする矢印
- 病変を計測するためのルーラー
- 3Dボリュームラベル (VoxelCloud)

特に CIRCUS RS は3Dボリュームラベルの扱いを特徴としており、こちらについては別ページで説明します。

## ビルトインアノテーションクラス

以下のアノテーションはCIRCUS RSの一部であり、常に利用可能です。

| クラス | 説明 |
|-|-|
| PointAnnotation (\*) | 画像上の1点を円や点などでマーク |
| VoxelCloud | 3Dボリューム |
| CornerText | ビューア描画領域の四隅に各種の情報をテキストで表示 |
| Dice (\*) | 描画方向を示すダイスを描画 |

(\*): 未実装

## アノテーションの作成

PointAnnotation を Viewer に加える場合は、以下のようにします。

```js
// Create a new Annotation...
const point = new PointAnnotation({
	position: [20, 20, 20],
	type: 'circle',
	size: 15,
	fillColor: '#ff0000',
	lineColor: '#ff0000',
	lineWidth: 1
});

// ...and assingn it to the composition.
// This automatiaclly triggers the rendering.
comp.addAnnotation(point);
```

## アノテーションの更新

既に登録されている既存のアノテーションを更新した場合、自動での再描画は行われないため、 Composition の `annotationsUpdated` メソッドを呼び出して Composition に更新が起きたことを通知する必要があります。代わりに同じアノテーションを再登録するのでも構いません。

```js
const annotations = comp.getAnnotations(point);
for (let a of annotations) {
	if (a instanceof PointAnnotation) {
		a.color = '#00ff00';
		comp.annotationsUpdated();
	}
}
```

## アノテーションの削除

```js
comp.removeAnnotations(point);
```

アノテーションの画面への描画は自動的に行われます。

## 独自アノテーションの作成

独自のアノテーションを作成することも可能です。独自のアノテーションは、単純に以下のメソッドを実装したオブジェクト（ないしクラスのインスタンス）です。

```
export interface Annotation {
	draw: (viewer: Viewer, viewState: ViewState) => Sprite;
}
```

*TODO: Spriteは削除予定*

ImageSource と異なり、キャンバスへの Annotation の描画自体は同期的に行う必要があります。つまり `Annotation#draw()` による描画処理は他の動作をブロックするため、時間のかかる描画処理は行わないように工夫してください。

## アノテーション再描画のタイミング

`annotationsUpdated()` や `addAnnotation()` などの再描画を伴うメソッドは、上記のように1つのイベント処理の中で複数回呼び出しても構いません。Viewer はアノテーションのレンダリングが必要であることを予約し、現在のイベントループが終了した後で1度のみ再描画を行います。

## アノテーションによるマウスイベントの取得と制御

（設計中）
