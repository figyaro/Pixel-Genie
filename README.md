<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pixel-Genie - AI Pixel Art Studio</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
    
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e2937 100%);
      color: #e2e8f0;
      margin: 0;
      padding: 0;
    }
    .hero {
      background: linear-gradient(90deg, #7c3aed, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      backdrop-filter: blur(12px);
    }
  </style>
</head>
<body>
  <div style="max-width: 1100px; margin: 0 auto; padding: 60px 20px; text-align: center;">
    
    <div style="margin-bottom: 24px;">
      <span style="font-size: 48px; filter: drop-shadow(0 0 20px #a855f7);">🧞‍♂️</span>
    </div>
    
    <h1 style="font-family: 'Space Grotesk', sans-serif; font-size: 3.2rem; font-weight: 700; margin: 0 0 16px 0; line-height: 1.1;">
      Pixel-Genie
    </h1>
    <p style="font-size: 1.4rem; color: #94a3b8; margin-bottom: 40px;">
      AIが魔法のように生み出す<br><span class="hero">究極のピクセルアートスタジオ</span>
    </p>

    <div style="display: flex; justify-content: center; gap: 16px; margin-bottom: 60px; flex-wrap: wrap;">
      <a href="https://github.com/figyaro/Pixel-Genie" 
         style="background: white; color: #0f172a; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 1.1rem; display: inline-flex; align-items: center; gap: 8px;">
        ★ GitHubでスターする
      </a>
      <a href="https://ai.studio/apps/7727f0ab-69d8-4e95-9932-2fa0c75d2b22" 
         target="_blank"
         style="background: #7c3aed; color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 1.1rem;">
        今すぐ試す →
      </a>
    </div>

    <div class="card" style="padding: 40px; margin-bottom: 60px; text-align: left; max-width: 800px; margin-left: auto; margin-right: auto;">
      <h2 style="font-size: 1.8rem; margin-top: 0;">✨ 主な機能</h2>
      <ul style="font-size: 1.15rem; line-height: 1.8; padding-left: 20px;">
        <li><strong>テキストから即生成</strong>：Gemini AIで「レトロな戦士」「かわいい猫のピクセルアート」など、プロンプトから高品質ピクセルアートを生成</li>
        <li><strong>画像から変換</strong>：写真やイラストをアップロード → 美しいピクセルアートに自動変換（背景除去も可能）</li>
        <li><strong>本格的な多層編集</strong>：レイヤー機能、Undo/Redo、選択ツール、塗りつぶし、消しゴムなど</li>
        <li><strong>解像度自由</strong>：16×16〜128×128まで対応</li>
        <li><strong>パレット自動最適化</strong> &amp; カラーピッカー完備</li>
        <li><strong>PNG一発ダウンロード</strong></li>
      </ul>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 60px;">
      <div class="card" style="padding: 28px;">
        <div style="font-size: 42px; margin-bottom: 16px;">🎨</div>
        <h3>クリエイターの魔法のランプ</h3>
        <p style="color: #94a3b8;">アイデアを言葉にすれば、AIが即座にピクセルアートにしてくれます。ゲームアセット、アイコン、NFT、ドット絵ファン必見！</p>
      </div>
      <div class="card" style="padding: 28px;">
        <div style="font-size: 42px; margin-bottom: 16px;">⚡</div>
        <h3>爆速プロトタイピング</h3>
        <p style="color: #94a3b8;">あなたの育AIやagent-sprite-forge、Hyoriなどのプロジェクトに、すぐに使えるピクセルアートを生成できます。</p>
      </div>
      <div class="card" style="padding: 28px;">
        <div style="font-size: 42px; margin-bottom: 16px;">🛠️</div>
        <h3>完全ローカル実行可能</h3>
        <p style="color: #94a3b8;">Gemini APIキー1つでローカル起動。プライバシーも安心。</p>
      </div>
    </div>

    <p style="font-size: 1.1rem; color: #64748b; margin-top: 40px;">
      Google AI Studioで生まれ、Vite + React + TypeScript + Geminiで構築。<br>
      あなたのクリエイティブな冒険を、ピクセル一つひとつからサポートします。
    </p>

    <div style="margin-top: 60px; padding-top: 40px; border-top: 1px solid rgba(255,255,255,0.1);">
      <a href="https://github.com/figyaro/Pixel-Genie" 
         style="color: #a855f7; text-decoration: none; font-weight: 600;">
        → GitHubリポジトリで今すぐチェック
      </a>
    </div>
  </div>
</body>
</html>
