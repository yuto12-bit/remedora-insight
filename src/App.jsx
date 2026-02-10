import React, { useState } from 'react';
import { 
  Megaphone, 
  PenTool, 
  Camera, 
  Mail, 
  Handshake, 
  Loader2, 
  Copy, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  History
} from 'lucide-react';

const App = () => {
  // --- State Management ---
  const [apiKey, setApiKey] = useState('');
  
  // Basic Info
  const [clientName, setClientName] = useState('');
  const [industry, setIndustry] = useState('建設・建築');
  const [url, setUrl] = useState('');

  // Metrics: Current Week
  const [visits, setVisits] = useState('');
  const [clicks, setClicks] = useState('');
  
  // Metrics: Previous Week
  const [prevVisits, setPrevVisits] = useState('');
  const [prevClicks, setPrevClicks] = useState('');

  // Optional Metrics
  const [applications, setApplications] = useState('');
  const [recentChanges, setRecentChanges] = useState('');

  // Output States
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tools States
  const [activeTool, setActiveTool] = useState(null);
  const [toolOutput, setToolOutput] = useState('');
  const [toolLoading, setToolLoading] = useState(false);
  const [toolInputs, setToolInputs] = useState({
    jobType: '',
    originalText: '',
    photoAppeal: '',
    replyType: '応募へのお礼と面接日程の提案',
    replyDetails: '',
    targetPersona: ''
  });

  const [copyStatus, setCopyStatus] = useState({ report: false, tool: false });

  // --- Logic ---

  // Gemini API Call Helper
  const callGemini = async (prompt, systemInstruction) => {
    const keyToUse = apiKey.trim();

    if (!keyToUse) {
      throw new Error("APIキーが設定されていません。画面上の入力欄にGemini APIキーを入力してください。");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${keyToUse}`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || `Status: ${response.status}`;
        throw new Error(`API Error: ${errorMessage}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "生成結果が空でした。";
    } catch (error) {
      console.error(error);
      throw new Error(`【通信エラー】\n詳細: ${error.message}\n\n対策:\n1. APIキーが正しいか確認してください。\n2. インターネット接続を確認してください。`);
    }
  };

  // Generate Report Logic (Updated for Translator Persona)
  const generateReport = async () => {
    // Validation
    if (!clientName || !visits || !clicks || !prevVisits || !prevClicks) {
      setError("必須項目（クライアント名、今週・前週の数値）をすべて入力してください。");
      return;
    }

    // --- Calculation Logic ---
    const vCurrent = parseInt(visits) || 0;
    const vPrev = parseInt(prevVisits) || 0;
    const cCurrent = parseInt(clicks) || 0;
    const cPrev = parseInt(prevClicks) || 0;

    const formatDiff = (curr, prev, unit) => {
      const diff = curr - prev;
      if (diff === 0) return `±0${unit}`;
      return diff > 0 ? `+${diff}${unit}` : `${diff}${unit}`;
    };

    const visitsDeltaFormatted = formatDiff(vCurrent, vPrev, '人');
    const clicksDeltaFormatted = formatDiff(cCurrent, cPrev, '回');
    const prevVisitsIsZero = vPrev === 0 ? 'はい' : 'いいえ';
    const prevClicksIsZero = cPrev === 0 ? 'はい' : 'いいえ';
    // -------------------------

    setError(null);
    setLoading(true);
    setReport('');

    // System Prompt: Defined strictly based on user requirements
    const systemPrompt = `
あなたは建設・介護・車検業界に特化した「採用導線の数字翻訳者」です。
専門用語（CVR, セッション, インプレッション等）は一切使わず、数字を“お店のたとえ”に置き換えて、経営者が一読で理解できる文章を作成してください。

# 最重要：無礼・断定・煽りを禁止
- です・ます調、常に「御社」表記。
- 相手を責める表現・煽る表現は禁止。
  禁止例：ダメ / 失敗 / 放置 / 危機 / 穴だらけ / 弱い / 悪い / 足りない / 最悪 / 手遅れ / 取りこぼし / 逃している
- 上の禁止語を1つでも書きそうになったら、必ず言い換えて出力し直すこと。
  言い換え例：
   - 取りこぼし → 「連絡まで進まなかった可能性」
   - 弱い/悪い → 「ここで迷いやすい可能性」
   - 放置 → 「未調整の状態」
- 恐怖訴求は禁止。代わりに「応募者の安心」「連絡のしやすさ」「社内工数の削減」で語る。

# 事実と推測を混ぜない
- 数字で言えること＝事実。それ以外＝推測。
- 推測には必ず「推測です」または「可能性があります」を付ける。
- 入力されていない情報は作らない（例：施策内容や原因を断定しない）。

# 計算ルール（必須）
- 今週/前週の増減（±）は必ず計算して明記する。
- 差分は入力データに計算済みで渡されるのでそれを必ず使う。
- 前週が0の場合、割合表現はしない（「増えました/減りました」のみ）。
- 「前週が0か：はい」の項目については、%・倍率・比率（例：◯%増、◯倍）は一切書かない（禁止）。

# 出力フォーマット（この順番固定・各セクションは長くしすぎない）
【1行まとめ】
今週の数字では「（最も目立つ事実）」が起きています。来週は「（改善1点）」を整えると、連絡が増える可能性があります。

【今週の事実（3行だけ）】
- 見た人数：今週X人（前週Y人 → ±Z人）
- 連絡ボタン（LINE/電話）の反応：今週A回（前週B回 → ±C回）
- 目立つ変化：増えた/減ったを1つだけ（根拠：上の数値）

【今の状態（お店のたとえで説明）】
「お店の前を通った人数（見た人数）→入口で連絡した人数（ボタン反応）」の流れで、
“どこで迷いやすい可能性があるか”を、数字だけで説明する（原因の断定は禁止）。

【連絡まで進まなかった“可能性”（推測です）】
- 前提：ボタン反応1回が応募完了に進む割合は会社ごとに幅があるため、ここでは仮に「1〜5割」と置く（推測です）
- 推測：今週、応募完了に進んだ可能性：◯〜◯人/週（推測です）
- 月換算：◯〜◯人/月（推測です）
※「応募完了数」が入力されている場合は、その実数を最優先し、上の推測は短く添えるだけにする。

【来週の改善は1点だけ（作業レベルで）】
最もインパクトが大きい修正を「1つ」だけ、作業として書く。

【期待される変化（推測です）】
- 連絡ボタン反応の増加見込み：+◯〜+◯回/週（推測です）
- 次週の成功判定（自動で決める）：
  * 今週が0〜2回 → +1回以上
  * 今週が3〜9回 → +2回以上
  * 今週が10回以上 → 今週比 +10% 以上

【次に見る数字（1つだけ）】
来週は「ボタン反応数（合計）」だけを見て判断します。

【注記（1行だけ）】
このレポートは御社の入力数値を読みやすく整理したもので、採用結果を保証するものではありません。
`;

    const userPrompt = `
# 入力データ
- クライアント名：${clientName}
- 業種：${industry}
- 対象URL：${url || 'なし'}
- 今週：サイトを見た人数 ${visits}人 / LINEクリック数・電話クリック数（合計） ${clicks}回
- 前週：サイトを見た人数 ${prevVisits}人 / LINEクリック数・電話クリック数（合計） ${prevClicks}回
- 応募完了数（任意）：${applications || 'データなし'}
- 今週に実施した変更（任意）：${recentChanges || '特になし'}
- 計算済み差分：見た人数の差分 ${visitsDeltaFormatted} / 反応数の差分 ${clicksDeltaFormatted}
- 前週が0か：見た人数 ${prevVisitsIsZero} / 反応数 ${prevClicksIsZero}

このデータをもとに、経営者向けのレポートを作成してください。
`;

    try {
      const result = await callGemini(userPrompt, systemPrompt);
      setReport(result);
      
      // Reset tools
      setActiveTool(null);
      setToolOutput('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Tool Logic (Kept from previous version, adapted where necessary)
  const runTool = async () => {
    if (!activeTool) return;
    
    setError(null);
    setToolLoading(true);
    setToolOutput('');

    let systemPrompt = "";
    let userPrompt = "";

    // Common Guard Rail for all tools
    const safetyGuard = `
# 安全・品質ガードレール（必須）
- 文体：丁寧な「です・ます」調。
- 禁止：攻撃的・煽り表現、誇張表現（No.1/絶対/必ず/100%等）。
- 禁止：年齢・性別・国籍などの限定表現を指示なく勝手に入れない（法務リスク回避）。
`;

    // Determine prompt based on tool
    if (activeTool === 'titleGen') {
      if (!toolInputs.jobType) { setError("職種を入力してください"); setToolLoading(false); return; }
      systemPrompt = `あなたは求人広告のコピーライターです。${industry}業界の求人で、クリック率を最大化する魅力的なタイトルを5つ考えてください。
ターゲット：地元で職を探している一般層。
ルール：ありきたりな表現は避け、ターゲットのインサイトを突く。30文字以内。
${safetyGuard}`;
      userPrompt = `募集職種：${toolInputs.jobType}\n魅力的なタイトルを5案提示してください。`;

    } else if (activeTool === 'textRewrite') {
      if (!toolInputs.originalText) { setError("元の文章を入力してください"); setToolLoading(false); return; }
      systemPrompt = `あなたは敏腕編集者です。${industry}の社長が書いた少し固い求人PR文を、求職者の感情を揺さぶる文章にリライトしてください。
ルール：嘘はつかない。「あなたの力が必要です」といった当事者意識を持たせる表現へ。
${safetyGuard}`;
      userPrompt = `元の文章：\n${toolInputs.originalText}\n\nこの文章をリライトしてください。`;

    } else if (activeTool === 'photoDir') {
      if (!toolInputs.photoAppeal) { setError("アピールポイントを入力してください"); setToolLoading(false); return; }
      systemPrompt = `あなたはプロの求人カメラマン兼ディレクターです。${industry}業界の求人で、求職者が「ここで働きたい」と思うような写真の構図を3つ指示してください。
${safetyGuard}`;
      userPrompt = `アピールポイント：${toolInputs.photoAppeal}\nスマホで撮れる範囲で、効果的な写真の指示書を作成してください。`;

    } else if (activeTool === 'replyGen') {
      systemPrompt = `あなたは${industry}業界の採用担当者です。応募者に対する、丁寧かつ親しみやすいLINEまたはメールの返信文を作成してください。
${safetyGuard}`;
      userPrompt = `返信の種類：${toolInputs.replyType}\n補足事項：${toolInputs.replyDetails}\n返信メッセージのドラフトを作成してください。`;

    } else if (activeTool === 'interview') {
      if (!toolInputs.targetPersona) { setError("ターゲット像を入力してください"); setToolLoading(false); return; }
      systemPrompt = `あなたは${industry}業界のベテラン採用担当です。「人間性」や「長く続くかどうか」を見極めるための鋭い質問リストを作成してください。
${safetyGuard}`;
      userPrompt = `採用したい人物像：${toolInputs.targetPersona}\n面接質問を5つ作成してください。`;
    }

    try {
      const result = await callGemini(userPrompt, systemPrompt);
      setToolOutput(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setToolLoading(false);
    }
  };

  const handleToolInputChange = (field, value) => {
    setToolInputs(prev => ({ ...prev, [field]: value }));
  };

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus(prev => ({ ...prev, [type]: true }));
      setTimeout(() => setCopyStatus(prev => ({ ...prev, [type]: false })), 2000);
    });
  };

  // --- UI Components ---
  const ToolCard = ({ id, icon: Icon, title, desc }) => (
    <div 
      onClick={() => setActiveTool(id)}
      className={`
        bg-white p-4 rounded-lg shadow-sm cursor-pointer border-2 transition-all duration-200
        flex flex-col items-center justify-center min-h-[100px] hover:-translate-y-0.5
        ${activeTool === id ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:shadow-md'}
      `}
    >
      <Icon className={`w-8 h-8 mb-2 ${activeTool === id ? 'text-emerald-600' : 'text-slate-600'}`} />
      <span className="text-sm font-bold text-slate-700 leading-tight text-center">{title}</span>
      <span className="text-xs text-slate-400 mt-1">{desc}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
        
        {/* Header */}
        <h1 className="text-xl md:text-2xl font-bold text-center mb-6 text-slate-700 border-b-2 border-slate-100 pb-4">
          REMEDORA 採用診断レポート作成（PDF用）
        </h1>

        {/* API Key Input */}
        <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-dashed border-slate-300">
          <label className="block text-xs font-bold text-slate-500 mb-2">
            🔑 Gemini APIキー
          </label>
          <input 
            type="password" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="ここにキーを入力"
            className="w-full p-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:border-slate-500"
          />
        </div>

        {/* --- Main Inputs --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          {/* Left Column: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 border-b pb-1">基本情報</h3>
            <div>
              <label className="block text-sm font-bold mb-1">クライアント名</label>
              <input 
                type="text" 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="例：株式会社〇〇建設"
                className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">業種</label>
              <select 
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:border-slate-500"
              >
                <option value="建設・建築">建設・建築</option>
                <option value="介護・福祉">介護・福祉</option>
                <option value="自動車整備・車検">自動車整備・車検</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">対象URL（LPなど）</label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          {/* Right Column: Metrics */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 border-b pb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> 数値入力
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded">
                <label className="block text-xs font-bold text-slate-500 mb-1">今週：見た人数</label>
                <input 
                  type="number" 
                  value={visits}
                  onChange={(e) => setVisits(e.target.value)}
                  placeholder="例: 100"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <label className="block text-xs font-bold text-slate-500 mb-1">今週：ボタン反応数</label>
                <input 
                  type="number" 
                  value={clicks}
                  onChange={(e) => setClicks(e.target.value)}
                  placeholder="例: 3"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded opacity-80">
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <History className="w-3 h-3" /> 前週：見た人数
                </label>
                <input 
                  type="number" 
                  value={prevVisits}
                  onChange={(e) => setPrevVisits(e.target.value)}
                  placeholder="例: 80"
                  className="w-full p-2 border border-slate-300 rounded bg-slate-100"
                />
              </div>
              <div className="bg-slate-50 p-3 rounded opacity-80">
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <History className="w-3 h-3" /> 前週：ボタン反応数
                </label>
                <input 
                  type="number" 
                  value={prevClicks}
                  onChange={(e) => setPrevClicks(e.target.value)}
                  placeholder="例: 2"
                  className="w-full p-2 border border-slate-300 rounded bg-slate-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Optional Inputs (Expandable or just listed) */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <h3 className="text-sm font-bold text-slate-500 mb-3">精度アップ用（任意）</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">実際の応募完了数</label>
              <input 
                type="number" 
                value={applications}
                onChange={(e) => setApplications(e.target.value)}
                placeholder="例：1（空欄なら推測します）"
                className="w-full p-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">今週実施した変更点</label>
              <input 
                type="text" 
                value={recentChanges}
                onChange={(e) => setRecentChanges(e.target.value)}
                placeholder="例：写真を現場風景に変更した"
                className="w-full p-2 border border-slate-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={generateReport}
          disabled={loading}
          className="w-full p-4 bg-slate-800 text-white font-bold text-lg rounded shadow-lg hover:bg-slate-900 transition duration-200 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : '📄'} 
          PDFコピペ用レポートを作成
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start gap-3 rounded-r">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm whitespace-pre-wrap font-medium">{error}</div>
          </div>
        )}

        {/* Report Output */}
        {report && (
          <div className="mt-8 bg-white p-6 rounded-lg border-2 border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                診断レポート（プレビュー）
              </h2>
              <button 
                onClick={() => copyToClipboard(report, 'report')}
                className="py-2 px-4 bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded hover:bg-slate-200 transition text-sm flex items-center gap-2"
              >
                {copyStatus.report ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copyStatus.report ? 'コピー完了' : '全文コピー'}
              </button>
            </div>
            <textarea 
              readOnly 
              value={report}
              className="w-full h-[500px] p-4 border border-slate-200 rounded text-sm bg-slate-50 focus:outline-none resize-y font-mono leading-relaxed text-slate-700"
            />
          </div>
        )}

        {/* Rescue Tools Section - Only shown when report exists */}
        {report && (
          <div className="mt-12 pt-8 border-t-2 border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-slate-700 rounded-full"></div>
              <h3 className="text-lg font-bold text-slate-700">🛠 改善策の実行ツール（オプション）</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6 pl-3">レポートで提案した「改善点」を、ここですぐに具体化できます。</p>

            {/* Tool Selection Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <ToolCard id="titleGen" icon={Megaphone} title={<>タイトル<br/>生成</>} desc="訪問数UP" />
              <ToolCard id="textRewrite" icon={PenTool} title={<>文章<br/>リライト</>} desc="反応率UP" />
              <ToolCard id="photoDir" icon={Camera} title={<>撮影<br/>指示書</>} desc="魅力UP" />
              <ToolCard id="replyGen" icon={Mail} title={<>応募返信<br/>作成</>} desc="対応効率化" />
              <ToolCard id="interview" icon={Handshake} title={<>面接質問<br/>作成</>} desc="採用力UP" />
            </div>

            {/* Tool Input Areas */}
            {activeTool && (
              <div className="bg-white p-5 rounded-lg border-t-4 border-emerald-500 shadow-sm animate-in zoom-in-50 duration-300">
                
                {/* Title Generator Input */}
                {activeTool === 'titleGen' && (
                  <div>
                    <label className="block text-sm font-bold mb-2">募集している職種は？</label>
                    <input 
                      type="text" 
                      value={toolInputs.jobType}
                      onChange={(e) => handleToolInputChange('jobType', e.target.value)}
                      placeholder="例：未経験の配管工、夜勤専従の介護士"
                      className="w-full p-3 border border-slate-300 rounded mb-3"
                    />
                    <button onClick={runTool} disabled={toolLoading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition flex justify-center items-center gap-2">
                      {toolLoading ? <Loader2 className="animate-spin" /> : '✨'} 魅力的なタイトルを5案生成
                    </button>
                  </div>
                )}

                {/* Text Rewriter Input */}
                {activeTool === 'textRewrite' && (
                  <div>
                    <label className="block text-sm font-bold mb-2">現在のPR文や説明文を入力してください</label>
                    <textarea 
                      value={toolInputs.originalText}
                      onChange={(e) => handleToolInputChange('originalText', e.target.value)}
                      placeholder="例：当社はアットホームな職場で、やる気のある方を募集しています。残業も少なめです。"
                      className="w-full p-3 h-24 border border-slate-300 rounded mb-3 resize-y"
                    />
                    <button onClick={runTool} disabled={toolLoading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition flex justify-center items-center gap-2">
                      {toolLoading ? <Loader2 className="animate-spin" /> : '✨'} 感情に響く文章にリライト
                    </button>
                  </div>
                )}

                {/* Photo Director Input */}
                {activeTool === 'photoDir' && (
                  <div>
                    <label className="block text-sm font-bold mb-2">アピールしたい職場の雰囲気や強み</label>
                    <input 
                      type="text" 
                      value={toolInputs.photoAppeal}
                      onChange={(e) => handleToolInputChange('photoAppeal', e.target.value)}
                      placeholder="例：チームワークが良い、精密な技術力、女性も活躍中"
                      className="w-full p-3 border border-slate-300 rounded mb-3"
                    />
                    <button onClick={runTool} disabled={toolLoading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition flex justify-center items-center gap-2">
                      {toolLoading ? <Loader2 className="animate-spin" /> : '✨'} 撮影アイデア・構図を生成
                    </button>
                  </div>
                )}

                {/* Reply Generator Input */}
                {activeTool === 'replyGen' && (
                  <div>
                    <label className="block text-sm font-bold mb-2">返信の目的を選んでください</label>
                    <select 
                      value={toolInputs.replyType}
                      onChange={(e) => handleToolInputChange('replyType', e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded mb-3"
                    >
                      <option value="応募へのお礼と面接日程の提案">応募へのお礼と面接日程の提案</option>
                      <option value="面接前日のリマインド">面接前日のリマインド</option>
                      <option value="不採用の通知（丁重に）">不採用の通知（丁重に）</option>
                      <option value="内定の連絡">内定の連絡</option>
                    </select>
                    <label className="block text-sm font-bold mb-2">補足事項（日時や条件など）</label>
                    <input 
                      type="text" 
                      value={toolInputs.replyDetails}
                      onChange={(e) => handleToolInputChange('replyDetails', e.target.value)}
                      placeholder="例：来週の平日夕方以降で3候補ほど欲しい"
                      className="w-full p-3 border border-slate-300 rounded mb-3"
                    />
                    <button onClick={runTool} disabled={toolLoading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition flex justify-center items-center gap-2">
                      {toolLoading ? <Loader2 className="animate-spin" /> : '✨'} 返信メッセージを作成
                    </button>
                  </div>
                )}

                {/* Interview Input */}
                {activeTool === 'interview' && (
                  <div>
                    <label className="block text-sm font-bold mb-2">どんな人物を採用したいですか？</label>
                    <input 
                      type="text" 
                      value={toolInputs.targetPersona}
                      onChange={(e) => handleToolInputChange('targetPersona', e.target.value)}
                      placeholder="例：真面目で長く続く人、チームワーク重視"
                      className="w-full p-3 border border-slate-300 rounded mb-3"
                    />
                    <button onClick={runTool} disabled={toolLoading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition flex justify-center items-center gap-2">
                      {toolLoading ? <Loader2 className="animate-spin" /> : '✨'} 面接質問リストを作成
                    </button>
                  </div>
                )}

                {/* Tool Output Area */}
                {(toolOutput || toolLoading) && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <label className="block text-sm font-bold mb-2 text-slate-600">ツール生成結果：</label>
                    {toolLoading && !toolOutput ? (
                      <div className="h-32 flex items-center justify-center text-slate-400 bg-slate-50 rounded border border-slate-200">
                        <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin" /> AIが思考中...
                        </div>
                      </div>
                    ) : (
                      <>
                        <textarea 
                          readOnly 
                          value={toolOutput}
                          className="w-full h-48 p-3 border border-slate-300 rounded text-sm bg-white focus:outline-none resize-y"
                        />
                        <button 
                          onClick={() => copyToClipboard(toolOutput, 'tool')}
                          className="mt-3 py-2 px-4 bg-white border border-slate-700 text-slate-700 font-bold rounded hover:bg-slate-50 transition text-sm flex items-center gap-2"
                        >
                          {copyStatus.tool ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                          {copyStatus.tool ? 'コピー完了' : '結果をコピー'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;