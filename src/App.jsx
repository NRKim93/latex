import React, { useState, useEffect } from 'react';
import { Copy, Check, FileText, ArrowRight, HelpCircle } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const App = () => {
  const [input, setInput] = useState(
    `\\section{LaTeX to Word 변환기}

이 도구는 LaTeX 코드를 Microsoft Word에서 사용할 수 있는 형식으로 변환해줍니다.

\\subsection{텍스트 서식 테스트}
이곳은 \\textbf{굵은 글씨}와 \\textit{이탤릭체}, 그리고 \\underline{밑줄}을 테스트합니다.

\\subsection{리스트 테스트}
\\begin{itemize}
  \\item 첫 번째 항목입니다.
  \\item 두 번째 항목입니다.
\\end{itemize}

\\subsection{수식 테스트 (KaTeX)}
피타고라스 정리는 다음과 같습니다:
$$ a^2 + b^2 = c^2 $$

근의 공식은 아래와 같이 씁니다.
$$ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $$

문장 중간에 들어가는 인라인 수식 $ E = mc^2 $ 도 지원합니다.`
  );
  
  const [previewHtml, setPreviewHtml] = useState('');
  const [copyStatus, setCopyStatus] = useState('idle'); // idle, copying, copied, error
  // Parsing Logic
  useEffect(() => {
    
    // Basic Parsing Pipeline
    let text = input;

    // 1. Escape HTML special characters (basic protection)
    // We do this carefully to not break regex replacement later
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 2. Math Handling (Inline and Block) using Regex
    // We split by standard delimiters to identify math blocks
    // Pattern: $$...$$ OR $...$
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
    
    const parts = text.split(mathRegex);
    
    const processedParts = parts.map(part => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Block Math
        const math = part.slice(2, -2);
        try {
          return katex.renderToString(math, { 
            displayMode: true, 
            output: 'mathml', // Word prefers MathML
            throwOnError: false 
          });
        } catch (e) {
          return `<span class="text-red-500">Error: ${e.message}</span>`;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        // Inline Math
        const math = part.slice(1, -1);
        try {
          return katex.renderToString(math, { 
            displayMode: false, 
            output: 'mathml',
            throwOnError: false 
          });
        } catch (e) {
          return `<span class="text-red-500">Error: ${e.message}</span>`;
        }
      } else {
        // Text Processing
        let processedText = part;

        // Sections
        processedText = processedText.replace(
          /\\section\{(.*?)\}/g,
          "<h2 class=\"text-[18pt] font-bold text-[#2E74B5] mt-4 mb-2 pb-1 border-b border-gray-200\">$1</h2>"
        );
        processedText = processedText.replace(
          /\\subsection\{(.*?)\}/g,
          "<h3 class=\"text-[14pt] font-bold text-[#2E74B5] mt-4 mb-2\">$1</h3>"
        );
        processedText = processedText.replace(
          /\\subsubsection\{(.*?)\}/g,
          "<h4 class=\"text-[12pt] font-bold text-[#1F4D78] mt-4 mb-2\">$1</h4>"
        );

        // Text Formatting
        processedText = processedText.replace(/\\textbf\{(.*?)\}/g, "<strong>$1</strong>");
        processedText = processedText.replace(/\\textit\{(.*?)\}/g, "<em>$1</em>");
        processedText = processedText.replace(/\\underline\{(.*?)\}/g, "<u>$1</u>");
        
        // Lists (Simple implementation)
        // Convert \begin{itemize} to <ul>, \item to <li>, \end{itemize} to </ul>
        // Note: This is a loose parser and assumes valid nesting
        processedText = processedText.replace(/\\begin\{itemize\}/g, "<ul class=\"list-disc pl-6 mb-4\">");
        processedText = processedText.replace(/\\end\{itemize\}/g, "</ul>");
        processedText = processedText.replace(/\\item\s+(.*?)(?=(\\item|\\end\{itemize\}|$))/gs, "<li class=\"mb-1\">$1</li>");
        // Fallback for single line items if regex above misses complex cases
        processedText = processedText.replace(/\\item/g, "<li class=\"mb-1\">"); 

        // Newlines
        // Replace double backslash with break
        processedText = processedText.replace(/\\\\/g, "<br/>");
        // Preserve paragraph breaks (double newline)
        processedText = processedText.replace(/\n\n/g, "<br/><br/>");

        return processedText;
      }
    });

    setPreviewHtml(processedParts.join(''));
  }, [input]);

  const handleCopy = async () => {
    setCopyStatus('copying');
    
    try {
      // We need to create a Blob with text/html MIME type to preserve formatting for Word
      const blob = new Blob([previewHtml], { type: 'text/html' });
      const textBlob = new Blob([input], { type: 'text/plain' });
      
      const item = new ClipboardItem({
        'text/html': blob,
        'text/plain': textBlob
      });

      await navigator.clipboard.write([item]);
      
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      // Fallback for browsers that don't support ClipboardItem well
      try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = previewHtml;
        document.body.appendChild(tempDiv);
        
        const range = document.createRange();
        range.selectNode(tempDiv);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        
        document.execCommand('copy');
        
        document.body.removeChild(tempDiv);
        window.getSelection().removeAllRanges();
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
      } catch (fallbackErr) {
        setCopyStatus('error');
        setTimeout(() => setCopyStatus('idle'), 2000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">LaTeX to Word 변환기</h1>
            <p className="text-xs text-gray-500">LaTeX 코드를 복사하여 Word 문서에 바로 붙여넣으세요</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 mr-4 bg-gray-100 px-3 py-1.5 rounded-full">
            <HelpCircle size={14} />
            <span>수식은 MathML로 변환되어 Word 호환성이 높습니다</span>
          </div>
          <button
            onClick={handleCopy}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm
              ${copyStatus === 'copied' 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              }
            `}
          >
            {copyStatus === 'copied' ? (
              <>
                <Check size={18} />
                <span>복사 완료!</span>
              </>
            ) : (
              <>
                <Copy size={18} />
                <span>Word용 복사</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden">
        
        {/* Editor Section */}
        <div className="flex-1 flex flex-col border-r border-gray-200 min-w-0 bg-white">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <span>LaTeX 입력</span>
            </span>
            <button 
              onClick={() => setInput('')} 
              className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              지우기
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed bg-white text-gray-800"
            placeholder="여기에 LaTeX 코드를 입력하세요..."
            spellCheck={false}
          />
        </div>

        {/* Mobile Divider */}
        <div className="md:hidden h-12 bg-gray-100 flex items-center justify-center border-y border-gray-200 text-gray-400">
          <ArrowRight className="transform rotate-90" size={20} />
        </div>

        {/* Preview Section */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-100 relative">
          <div className="bg-white px-4 py-2 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
            <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <span>미리보기</span>            </span>
            <span className="text-xs text-gray-400">Word 문서 스타일</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {/* Word Document Simulation Container */}
            <div 
              className="bg-white shadow-lg mx-auto min-h-full max-w-[21cm] p-[2.5cm] outline-none"
              style={{
                fontFamily: "'Calibri', 'Malgun Gothic', sans-serif"
              }}
            >
              <div 
                className="preview-content text-[11pt] leading-[1.5] text-gray-800"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />

              {input.trim() === '' && (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 pointer-events-none mt-20">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p>미리보기가 여기에 표시됩니다.</p> 
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;
