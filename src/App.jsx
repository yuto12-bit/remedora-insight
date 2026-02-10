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
  AlertCircle
} from 'lucide-react';

const App = () => {
  // --- State Management ---
  const [apiKey, setApiKey] = useState('');
  const [industry, setIndustry] = useState('建設・建築');
  const [visits, setVisits] = useState('');
  const [clicks, setClicks] = useState('');
  const [source, setSource] = useState('Indeed');

  const [report, setReport] = useState('');
  const [reportType, setReportType] = useState(null); // 'basic' | 'ai'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [activeTool, setActiveTool] = useState(null);
  const [toolOutput, setToolOutput] = useState('');
  const [toolLoading, setToolLoading] = useState(false);

  // Tool Inputs State
  const [toolInputs, setToolInputs] = useState({
    jobType: '',
    originalText: '',
    photoAppeal: '',
    replyType: '応募へのお礼と面接日程の提案',
    replyDetails: '',
    targetPersona: ''
  });

  // UI Feedback State
  const [copyStatus, setCopyStatus] = useState({ report: false, tool: false });

  // --- Logic ---

  // Gemini API Call Helper
  const callGemini = async (prompt, systemInstruction) => {
    // 1. Try manual input first, then default (if any)
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

  // Basic Report Logic
  const generateBasicReport = () => {
    const visitsNum = parseInt(visits);
    const clicksNum = parseInt(clicks);

    if (isNaN(visitsNum) || isNaN(clicksNum)) {
      setError("数値を正しく入力してください。");
      return;
    }

    setError(null);
    setLoading(true);

    // Simulate slight delay for UX
    setTimeout(() => {
      let status = "", nextStep = "", analysis = "";
      const rate = visitsNum > 0 ? (clicksNum / visitsNum) * 100 : 0;

      if (visitsNum < 20) {
        status = "入口に課題";
        analysis = `今週、求人ページまでたどり着いたのは${visitsNum}人のみです。中身が良いか悪いか判断する以前に、そもそも知られていません。`;
        nextStep = `来週は「${source}」に掲載している写真またはタイトル（見出し）を1箇所だけ変更し、クリックされる数を増やします。`;
      } else if (rate < 1.0) {
        status = "中身に課題";
        analysis = `今週は${visitsNum}人がページを見ましたが、ボタンを押したのは${clicksNum}人でした。興味を持って訪れたものの、「何かが違う」と感じて帰っています。`;
        nextStep = `来週は求人ページの冒頭にある「給与」または「休日」の表記を、より分かりやすく具体的に書き直します。`;
      } else {
        status = "順調";
        analysis = `今週は${visitsNum}人が見て、そのうち${clicksNum}人が興味を持ってボタンを押しました。100人が見れば${Math.round(rate * 10) / 10}人が反応する計算で、地域の平均以上の成果が出ています。`;
        nextStep = `現在の内容を変に触るとバランスが崩れます。来週は変更を加えず、応募があった際に「どこを見て連絡したか」を電話口で聞くことだけ徹底してください。`;
      }

      const reportText = `【今週の結論】\n${status}\n\n【事実の可視化】\n${analysis}\n\n【次の一手】\n${nextStep}\n\n（REMEDORA Web監査役）`;
      
      setReport(reportText);
      setReportType('basic');
      setLoading(false);
      
      // Reset tools
      setActiveTool(null);
      setToolOutput('');
    }, 500);
  };

  // AI Report Logic
  const generateAIReport = async () => {
    const visitsNum = parseInt(visits);
    const clicksNum = parseInt(clicks);

    if (isNaN(visitsNum) || isNaN(clicksNum)) {
      setError("数値を正しく入力してください。");
      return;
    }

    setError(null);
    setLoading(true);
    setReport('');

    const systemPrompt = `
あなたは地元の建設・介護・車検工場の社長を支える、実直で誠実なREMEDORAのWeb監査役です。
専門用語（CVR、セッション、エンゲージメントなど）は一切使用禁止です。
入力された数値に基づき、経営者に対して厳しいが愛のある報告を行ってください。
業種：${industry}

判定基準：
1. 訪問数20未満 → 「入口に課題」。認知不足。
2. 訪問数20以上かつ反応率1%未満 → 「中身に課題」。魅力不足。
3. 反応率1%以上 → 「順調」。

出力フォーマット：
【今週の結論】
（順調 / 入口に課題 / 中身に課題）

【事実の可視化】
（数値の解説と、それが経営にどう影響するか）

【次の一手】
（具体的な改善アクション1つ）

（REMEDORA Web監査役）
`;

    const userPrompt = `
業種：${industry}
今週のLP訪問数：${visitsNum}人
LINE/電話ボタンのクリック数：${clicksNum}回
主な流入元：${source}
`;

    try {
      const result = await callGemini(userPrompt, systemPrompt);
      setReport(result);
      setReportType('ai');
      
      // Reset tools
      setActiveTool(null);
      setToolOutput('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Tool Logic
  const runTool = async () => {
    if (!activeTool) return;
    
    setError(null);
    setToolLoading(true);
    setToolOutput('');

    let systemPrompt = "";
    let userPrompt = "";

    // Determine prompt based on tool
    if (activeTool === 'titleGen') {
      if (!toolInputs.jobType) { setError("職種を入力してください"); setToolLoading(false); return; }
      systemPrompt = `あなたは求人広告のコピーライターです。${industry}業界の求人で、クリック率を最大化する魅力的なタイトルを5つ考えてください。
ターゲット：地元で職を探している一般層。
ルール：
- 「高収入」「アットホーム」などのありきたりな表現は避ける。
- ターゲットのインサイト（本音の悩み）を突く。
- 30文字以内。`;
      userPrompt = `募集職種：${toolInputs.jobType}\n媒体：${source}\n魅力的なタイトルを5案提示してください。`;

    } else if (activeTool === 'textRewrite') {
      if (!toolInputs.originalText) { setError("元の文章を入力してください"); setToolLoading(false); return; }
      systemPrompt = `あなたは敏腕編集者です。${industry}の社長が書いた少し固い、あるいは平凡な求人PR文を、求職者の感情を揺さぶる文章にリライトしてください。
ルール：
- 嘘はつかない。事実をベースにする。
- 「募集しています」ではなく「あなたの力が必要です」といった当事者意識を持たせる表現へ。
- 読みやすく、親しみやすいトーンで。`;
      userPrompt = `元の文章：\n${toolInputs.originalText}\n\nこの文章を、より魅力的で応募したくなる文章にリライトしてください。`;

    } else if (activeTool === 'photoDir') {
      if (!toolInputs.photoAppeal) { setError("アピールポイントを入力してください"); setToolLoading(false); return; }
      systemPrompt = `あなたはプロの求人カメラマン兼ディレクターです。
${industry}業界の求人で、求職者が「ここで働きたい」と思うような写真の構図を3つ具体的に指示してください。
ルール：
- 抽象的な指示（例：「笑顔の写真」）はNG。「誰が、どこで、何をしている時の、どの角度からの写真か」を具体的に書く。
- なぜその写真が良いかの理由も添える。`;
      userPrompt = `アピールポイント：${toolInputs.photoAppeal}\nスマホで撮れる範囲で、効果的な写真の指示書を作成してください。`;

    } else if (activeTool === 'replyGen') {
      systemPrompt = `あなたは${industry}業界の採用担当者です。
応募者に対する、丁寧かつ親しみやすいLINEまたはメールの返信文を作成してください。
ルール：
- 堅苦しすぎる敬語（拝啓・敬具など）はLINEの場合は避ける。
- 相手が返信しやすい配慮を入れる。
- 必要な連絡事項を明確にする。`;
      userPrompt = `返信の種類：${toolInputs.replyType}\n補足事項：${toolInputs.replyDetails}\nこれらを盛り込んだ返信メッセージのドラフトを作成してください。`;

    } else if (activeTool === 'interview') {
      if (!toolInputs.targetPersona) { setError("ターゲット像を入力してください"); setToolLoading(false); return; }
      systemPrompt = `あなたは${industry}業界のベテラン採用担当です。
応募者の表面的なスキルではなく、「人間性」や「長く続くかどうか」を見極めるための鋭い質問リストを作成してください。`;
      userPrompt = `採用したい人物像：${toolInputs.targetPersona}\nこの人物が自社に合うか、また覚悟があるかを見極めるための面接質問を5つ作成してください。`;
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

  // Helper to update tool inputs
  const handleToolInputChange = (field, value) => {
    setToolInputs(prev => ({ ...prev, [field]: value }));
  };

  // Copy to clipboard
  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus(prev => ({ ...prev, [type]: true }));
      setTimeout(() => setCopyStatus(prev => ({ ...prev, [type]: false })), 2000);
    });
  };

  // --- Components for Tools ---
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
      <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
        
        {/* Header */}
        <h1 className="text-xl md:text-2xl font-bold text-center mb-6 text-slate-700 border-b-2 border-slate-100 pb-4">
          REMEDORA 週間監査レポート作成
        </h1>

        {/* API Key Input */}
        <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-dashed border-slate-300">
          <label className="block text-xs font-bold text-slate-500 mb-2">
            🔑 Gemini APIキー（自動で動かない場合はここに入力）
          </label>
          <input 
            type="password" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AI Studioで取得したキーを貼り付け"
            className="w-full p-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:border-slate-500"
          />
        </div>

        {/* Main Inputs */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-bold mb-2">業種（AI分析用）</label>
            <select 
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:border-slate-500"
            >
              <option value="建設・建築">建設・建築</option>
              <option value="介護・福祉">介護・福祉</option>
              <option value="自動車整備・車検">自動車整備・車検</option>
              <option value="一般企業">その他・一般</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">今週のLP訪問数（人）</label>
            <input 
              type="number" 
              value={visits}
              onChange={(e) => setVisits(e.target.value)}
              placeholder="例：50"
              className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">LINE/電話ボタンのクリック数（回）</label>
            <input 
              type="number" 
              value={clicks}
              onChange={(e) => setClicks(e.target.value)}
              placeholder="例：1"
              className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">主な流入元</label>
            <select 
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:border-slate-500"
            >
              <option value="Indeed">Indeed</option>
              <option value="Googleビジネスプロフィール">Googleマップ(GBP)</option>
              <option value="求人チラシ">求人チラシ</option>
              <option value="SNS">SNS</option>
              <option value="その他">その他</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <button 
            onClick={generateBasicReport}
            className="w-full p-3.5 bg-slate-400 text-white font-bold rounded hover:bg-slate-500 transition duration-200"
          >
            簡易レポート作成（従来版）
          </button>
          <button 
            onClick={generateAIReport}
            disabled={loading}
            className="w-full p-3.5 bg-slate-700 text-white font-bold rounded shadow-md hover:bg-slate-800 transition duration-200 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : '✨'} 
            AI深層監査レポートを作成
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start gap-3 rounded-r">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm whitespace-pre-wrap font-medium">{error}</div>
          </div>
        )}

        {/* Report Output */}
        {report && (
          <div className="mt-8 bg-slate-50 p-6 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-600 flex items-center gap-2">
                生成結果
              </h2>
              <span className={`text-xs px-2 py-1 rounded-full text-white ${reportType === 'ai' ? 'bg-slate-700' : 'bg-slate-400'}`}>
                {reportType === 'ai' ? 'AI分析済' : '簡易版'}
              </span>
            </div>
            <textarea 
              readOnly 
              value={report}
              className="w-full h-64 p-3 border border-slate-300 rounded text-sm bg-white focus:outline-none resize-y"
            />
            <button 
              onClick={() => copyToClipboard(report, 'report')}
              className="mt-3 py-2 px-4 bg-white border border-slate-700 text-slate-700 font-bold rounded hover:bg-slate-50 transition text-sm flex items-center gap-2"
            >
              {copyStatus.report ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copyStatus.report ? 'コピーしました' : '文章をコピーする'}
            </button>
          </div>
        )}

        {/* Rescue Tools Section - Only shown when report exists */}
        {report && (
          <div className="mt-10 pt-8 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-slate-700 rounded-full"></div>
              <h3 className="text-lg font-bold text-slate-700">🛠 監査結果に基づく お助けツール</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6 pl-3">今の課題に合わせて、AIに作業を代行させましょう。</p>

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
                          {copyStatus.tool ? 'コピーしました' : '結果をコピー'}
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