---
title: Core Concepts of CIRCUS RS
---

# CIRCUS RS の基本構成

## ImageSource

ボリュームへアクセスし、断面図をキャンバスへ描画します。  
ボリュームへのアクセス方法別に、複数の実装が存在します。

| class | データの生成方法 |
|-|-|
| `DynamicImageSource` | 描画の都度サーバーから断面図データを取得して描画します |
| `RawVolumeImageSource` | はじめにサーバーからボリュームデータを取得した後、クライアント側で断面図データを生成して描画します |
| `HybridImageSource` | 基本的な動きは `RawVolumeImageSource` と同じですが、ボリュームを取得するまでの間 `DynamicImageSource` として動作する点が異なります |

## Annotation

注記をキャンバスへ描画します。  

## Viewer  

ボリュームの描画設定を管理したり ImageSource や Annotation へ描画の依頼を出します。  
キャンバスで発生したイベントを適切に Tool へ伝搬させます。

## Tool
Viewerの描画設定を変更したり、Annotationの作成を行ったりします。

## Composition

各種オブジェクトのコンテナです。  
ImageSource と Viewer を関連させるハブの役割を担います。
