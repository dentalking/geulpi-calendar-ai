import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

/**
 * 🎨 멀티모달 테스트 헬퍼
 * E2E 테스트에 필요한 이미지, 음성 등을 자동 생성/다운로드
 */

export interface TestImageOptions {
  type: 'conference-invitation' | 'meeting-notes' | 'schedule-screenshot' | 'whiteboard';
  text?: string;
  width?: number;
  height?: number;
}

/**
 * 테스트용 이미지 생성 (Canvas 없이 모의 이미지 사용)
 */
export async function generateTestImage(options: TestImageOptions): Promise<string> {
  const { type, text = '' } = options;
  
  // 테스트용 SVG 생성
  let svgContent = '';
  
  switch (type) {
    case 'conference-invitation':
      svgContent = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="white"/>
        <rect width="800" height="100" fill="#1a73e8"/>
        <text x="50" y="60" font-family="Arial" font-size="32" font-weight="bold" fill="white">Conference Invitation</text>
        <text x="50" y="150" font-family="Arial" font-size="24" fill="#333">AI Conference 2024</text>
        <text x="50" y="190" font-family="Arial" font-size="24" fill="#333">Date: Dec 15, 2024</text>
        <text x="50" y="230" font-family="Arial" font-size="24" fill="#333">Time: 9:00 AM - 6:00 PM</text>
        <text x="50" y="270" font-family="Arial" font-size="24" fill="#333">Venue: COEX, Seoul</text>
      </svg>`;
      break;
      
    case 'meeting-notes':
      svgContent = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="white"/>
        <text x="50" y="50" font-family="Arial" font-size="20" font-style="italic" fill="#333">Action Items:</text>
        <text x="70" y="100" font-family="Arial" font-size="18" fill="#333">□ 프로토타입 검토 - 12/20</text>
        <text x="70" y="130" font-family="Arial" font-size="18" fill="#333">□ 사용자 피드백 수집 - 12/22</text>
        <text x="70" y="160" font-family="Arial" font-size="18" fill="#333">□ 다음 스프린트 계획 - 12/25</text>
      </svg>`;
      break;
      
    case 'schedule-screenshot':
      svgContent = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="#f8f9fa"/>
        <rect width="800" height="60" fill="white"/>
        <text x="20" y="40" font-family="Arial" font-size="24" font-weight="bold" fill="#333">December 2024</text>
        <rect x="130" y="120" width="100" height="40" fill="#4285f4"/>
        <text x="135" y="145" font-family="Arial" font-size="12" fill="white">Team Meeting</text>
      </svg>`;
      break;
      
    case 'whiteboard':
      svgContent = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="#f5f5f5"/>
        <rect x="50" y="50" width="150" height="80" fill="none" stroke="#333" stroke-width="2"/>
        <rect x="250" y="50" width="150" height="80" fill="none" stroke="#333" stroke-width="2"/>
        <rect x="450" y="50" width="150" height="80" fill="none" stroke="#333" stroke-width="2"/>
        <text x="80" y="95" font-family="Arial" font-size="16" fill="#333">Research</text>
        <text x="290" y="95" font-family="Arial" font-size="16" fill="#333">Design</text>
        <text x="480" y="95" font-family="Arial" font-size="16" fill="#333">Implement</text>
      </svg>`;
      break;
  }
  
  // SVG를 파일로 저장
  const fileName = `test-${type}-${Date.now()}.svg`;
  const filePath = path.join(process.cwd(), 'e2e', 'test-data', fileName);
  
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, svgContent);
  
  return filePath;
}

/**
 * 샘플 일정 이미지 다운로드
 */
export async function downloadSampleSchedule(fileName: string): Promise<string> {
  const samples = {
    'whiteboard-meeting-notes.jpg': 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?w=800',
    'conference-poster.jpg': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    'calendar-screenshot.png': 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800',
    'handwritten-schedule.jpg': 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800'
  };
  
  const url = samples[fileName as keyof typeof samples] || samples['whiteboard-meeting-notes.jpg'];
  const filePath = path.join(process.cwd(), 'e2e', 'test-data', fileName);
  
  // 캐시 확인
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    // 파일이 없으면 다운로드
  }
  
  // Unsplash 이미지 다운로드
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(buffer));
  
  return filePath;
}

/**
 * 음성 입력 시뮬레이션을 위한 헬퍼
 */
export async function generateVoiceCommand(text: string): Promise<string> {
  // 실제로는 TTS API를 사용하지만, 테스트에서는 시뮬레이션
  // 브라우저에서 Web Speech API를 직접 트리거
  return `
    window.simulateVoiceInput = (text) => {
      const event = new CustomEvent('voice-input', { 
        detail: { transcript: text, confidence: 0.95 } 
      });
      document.dispatchEvent(event);
    };
  `;
}

/**
 * OCR 결과 시뮬레이션
 */
export function simulateOCRResult(imagePath: string): string {
  // 실제로는 Vision API를 사용하지만, 테스트에서는 미리 정의된 결과 반환
  const ocrResults: Record<string, string> = {
    'conference-invitation': `AI Conference 2024
Date: Dec 15, 2024
Time: 9:00 AM - 6:00 PM
Venue: COEX, Seoul
Topics: LLM, Computer Vision, Robotics`,
    
    'meeting-notes': `Action Items:
- 프로토타입 검토 (Due: 12/20)
- 사용자 피드백 수집 (Due: 12/22)
- 다음 스프린트 계획 (Due: 12/25)
- QA 테스트 준비 (Due: 12/28)`,
    
    'schedule-screenshot': `December 2024
15 Mon: Team Meeting 2:00 PM
16 Tue: Client Call 10:00 AM
17 Wed: Sprint Review 3:00 PM
18 Thu: 1-on-1 with Manager 11:00 AM`,
    
    'whiteboard': `Project Timeline:
Phase 1: Research (2 weeks)
Phase 2: Design (3 weeks)
Phase 3: Implementation (4 weeks)
Phase 4: Testing (2 weeks)`
  };
  
  const imageType = path.basename(imagePath).split('-')[1];
  return ocrResults[imageType] || 'No text detected';
}

/**
 * 테스트 데이터 정리
 */
export async function cleanupTestData(): Promise<void> {
  const testDataDir = path.join(process.cwd(), 'e2e', 'test-data');
  
  try {
    const files = await fs.readdir(testDataDir);
    const testFiles = files.filter(f => f.startsWith('test-'));
    
    for (const file of testFiles) {
      await fs.unlink(path.join(testDataDir, file));
    }
  } catch (error) {
    // 디렉토리가 없어도 무시
  }
}

/**
 * 멀티모달 입력 조합 생성
 */
export async function createMultimodalInput(options: {
  text?: string;
  images?: string[];
  voice?: string;
}): Promise<{
  files: string[];
  transcript: string;
}> {
  const files: string[] = [];
  let transcript = options.text || '';
  
  // 이미지 처리
  if (options.images) {
    for (const imageType of options.images) {
      const imagePath = await generateTestImage({ 
        type: imageType as any,
        text: `Test ${imageType}`
      });
      files.push(imagePath);
    }
  }
  
  // 음성 처리
  if (options.voice) {
    transcript = options.voice;
  }
  
  return { files, transcript };
}