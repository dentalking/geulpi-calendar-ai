import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

/**
 * 🎭 멀티모달 시나리오
 * 음성, 이미지, 텍스트, 비디오 등 다양한 입력 방식 통합 테스트
 */

test.describe('🎨 멀티모달 UX', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
    
    // 미디어 권한 허용
    await context.grantPermissions(['microphone', 'camera']);
  });

  test.describe('음성 인터페이스', () => {
    test('자연어 음성 명령으로 일정 생성', async ({ page }) => {
      await page.goto('/dashboard');
      
      // 음성 입력 버튼 활성화
      await page.locator('[data-testid="voice-assistant"]').click();
      
      // 마이크 권한 확인
      await expect(page.locator('[data-testid="mic-status-active"]')).toBeVisible();
      await expect(page.locator('[data-testid="voice-animation"]')).toHaveClass(/listening/);
      
      // 복잡한 음성 명령 시뮬레이션
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('voiceInput', {
          detail: {
            transcript: '내일 오후 2시부터 4시까지 김팀장님, 박과장님과 함께 신제품 기획 회의를 회의실 A에서 하고 싶어요. 그리고 회의 30분 전에 알림도 설정해주세요.',
            confidence: 0.94
          }
        }));
      });
      
      // 음성 인식 결과 표시
      const transcript = page.locator('[data-testid="voice-transcript"]');
      await expect(transcript).toBeVisible();
      await expect(transcript).toContainText('신제품 기획 회의');
      
      // AI 파싱 결과
      const parsed = page.locator('[data-testid="parsed-event"]');
      await expect(parsed).toBeVisible();
      await expect(parsed.locator('[data-testid="event-title"]')).toContainText('신제품 기획 회의');
      await expect(parsed.locator('[data-testid="event-time"]')).toContainText('내일 14:00-16:00');
      await expect(parsed.locator('[data-testid="event-location"]')).toContainText('회의실 A');
      await expect(parsed.locator('[data-testid="event-attendees"]')).toContainText('김팀장, 박과장');
      await expect(parsed.locator('[data-testid="event-reminder"]')).toContainText('30분 전 알림');
      
      // 확인/수정 옵션
      await expect(page.locator('[data-testid="confirm-voice-event"]')).toBeVisible();
      await expect(page.locator('[data-testid="edit-voice-event"]')).toBeVisible();
      
      // 확인 후 일정 생성
      await page.locator('[data-testid="confirm-voice-event"]').click();
      await expect(page.locator('[data-testid="event-created"]')).toContainText('일정이 생성되었습니다');
    });

    test('연속 음성 대화로 일정 수정', async ({ page }) => {
      await page.goto('/calendar/event/1');
      
      // 음성 편집 모드
      await page.locator('[data-testid="voice-edit-mode"]').click();
      
      // 첫 번째 명령: 시간 변경
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('voiceInput', {
          detail: {
            transcript: '이 회의를 3시로 변경해줘',
            confidence: 0.91
          }
        }));
      });
      
      await expect(page.locator('[data-testid="voice-change-1"]')).toContainText('시간을 15:00로 변경');
      
      // AI 응답 (TTS)
      await expect(page.locator('[data-testid="ai-response"]')).toContainText('시간을 오후 3시로 변경했습니다. 다른 수정사항이 있나요?');
      
      // 두 번째 명령: 참석자 추가
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('voiceInput', {
          detail: {
            transcript: '이대리님도 초대해줘',
            confidence: 0.89
          }
        }));
      });
      
      await expect(page.locator('[data-testid="voice-change-2"]')).toContainText('이대리 추가');
      
      // 세 번째 명령: 완료
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('voiceInput', {
          detail: {
            transcript: '저장해줘',
            confidence: 0.95
          }
        }));
      });
      
      await expect(page.locator('[data-testid="voice-save-complete"]')).toContainText('모든 변경사항이 저장되었습니다');
      
      // 변경사항 반영 확인
      await expect(page.locator('[data-testid="event-time"]')).toContainText('15:00');
      await expect(page.locator('[data-testid="attendee-list"]')).toContainText('이대리');
    });

    test('다국어 음성 인식 지원', async ({ page }) => {
      await page.goto('/settings/voice');
      
      // 언어 설정
      await page.selectOption('[data-testid="voice-language"]', 'en-US');
      await page.locator('[data-testid="save-language"]').click();
      
      await page.goto('/dashboard');
      await page.locator('[data-testid="voice-assistant"]').click();
      
      // 영어 음성 명령
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('voiceInput', {
          detail: {
            transcript: 'Schedule a team meeting tomorrow at 2 PM for one hour',
            confidence: 0.92,
            language: 'en-US'
          }
        }));
      });
      
      await expect(page.locator('[data-testid="voice-transcript"]')).toContainText('team meeting tomorrow');
      await expect(page.locator('[data-testid="parsed-title"]')).toContainText('Team Meeting');
      
      // 혼용 언어 처리
      await page.selectOption('[data-testid="voice-language"]', 'ko-KR');
      
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('voiceInput', {
          detail: {
            transcript: '내일 Meeting을 3시로 reschedule해줘',
            confidence: 0.88,
            mixedLanguage: true
          }
        }));
      });
      
      await expect(page.locator('[data-testid="mixed-language-detected"]')).toBeVisible();
      await expect(page.locator('[data-testid="parsed-action"]')).toContainText('시간 변경: 15:00');
    });
  });

  test.describe('이미지 및 문서 처리', () => {
    test('이미지에서 일정 정보 추출 (OCR)', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 파일 업로드 영역
      await page.locator('[data-testid="upload-area"]').click();
      
      // Mock 이미지 파일 업로드
      const fileContent = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      await page.evaluate((content) => {
        const event = new CustomEvent('fileUpload', {
          detail: {
            file: {
              name: 'meeting-invite.png',
              type: 'image/png',
              content: content
            }
          }
        });
        window.dispatchEvent(event);
      }, fileContent);
      
      // OCR 처리 중 표시
      await expect(page.locator('[data-testid="ocr-processing"]')).toBeVisible();
      await expect(page.locator('[data-testid="processing-animation"]')).toHaveClass(/spinning/);
      
      // Mock OCR 결과
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ocrComplete', {
          detail: {
            text: 'Annual Conference 2024\nDate: March 15, 2024\nTime: 9:00 AM - 5:00 PM\nLocation: Grand Hotel, Seoul\nContact: events@company.com',
            confidence: 0.87,
            detectedElements: [
              { type: 'event_title', text: 'Annual Conference 2024', confidence: 0.95 },
              { type: 'date', text: 'March 15, 2024', confidence: 0.92 },
              { type: 'time', text: '9:00 AM - 5:00 PM', confidence: 0.88 },
              { type: 'location', text: 'Grand Hotel, Seoul', confidence: 0.91 },
              { type: 'contact', text: 'events@company.com', confidence: 0.85 }
            ]
          }
        }));
      });
      
      // 추출된 정보 표시
      const ocrResults = page.locator('[data-testid="ocr-results"]');
      await expect(ocrResults).toBeVisible();
      await expect(ocrResults.locator('[data-testid="extracted-title"]')).toContainText('Annual Conference 2024');
      await expect(ocrResults.locator('[data-testid="extracted-date"]')).toContainText('March 15, 2024');
      await expect(ocrResults.locator('[data-testid="extracted-time"]')).toContainText('9:00 AM - 5:00 PM');
      
      // 신뢰도 표시
      await expect(ocrResults.locator('[data-testid="confidence-title"]')).toContainText('95%');
      
      // 수정 가능한 필드
      await ocrResults.locator('[data-testid="edit-extracted-info"]').click();
      const editForm = page.locator('[data-testid="edit-form"]');
      await expect(editForm.locator('[data-testid="title-input"]')).toHaveValue('Annual Conference 2024');
      
      // 일정으로 변환
      await page.locator('[data-testid="create-event-from-ocr"]').click();
      await expect(page.locator('[data-testid="event-created-from-image"]')).toContainText('이미지에서 일정이 생성되었습니다');
    });

    test('회의록 이미지 분석 및 액션 아이템 추출', async ({ page }) => {
      await page.goto('/calendar/event/1/upload');
      
      // 회의록 이미지 업로드
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'meeting-notes.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      // AI 분석 시작
      await expect(page.locator('[data-testid="ai-analyzing"]')).toBeVisible();
      await expect(page.locator('[data-testid="analysis-progress"]')).toBeVisible();
      
      // Mock 회의록 분석 결과
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('meetingNotesAnalyzed', {
          detail: {
            summary: '신제품 개발 진행 상황 논의 및 다음 단계 계획',
            keyPoints: [
              '프로토타입 90% 완성',
              '사용자 테스트 다음 주 시작',
              '마케팅 전략 수립 필요'
            ],
            actionItems: [
              {
                task: '사용자 테스트 계획 수립',
                assignee: '김기획자',
                dueDate: '2024-02-05',
                priority: 'high'
              },
              {
                task: '마케팅 자료 초안 작성',
                assignee: '박마케터',
                dueDate: '2024-02-08',
                priority: 'medium'
              }
            ],
            decisions: [
              '사용자 테스트는 20명 대상으로 진행',
              '다음 회의는 테스트 결과 공유 후 진행'
            ]
          }
        }));
      });
      
      // 분석 결과 표시
      const analysisResults = page.locator('[data-testid="meeting-analysis"]');
      await expect(analysisResults).toBeVisible();
      
      // 요약
      await expect(analysisResults.locator('[data-testid="meeting-summary"]')).toContainText('신제품 개발 진행 상황');
      
      // 액션 아이템
      const actionItems = analysisResults.locator('[data-testid="action-items"]');
      await expect(actionItems.locator('.action-item')).toHaveCount(2);
      await expect(actionItems.locator('[data-testid="task-1"]')).toContainText('사용자 테스트 계획 수립');
      await expect(actionItems.locator('[data-testid="assignee-1"]')).toContainText('김기획자');
      
      // 우선순위 표시
      await expect(actionItems.locator('[data-testid="priority-high"]')).toHaveClass(/high-priority/);
      
      // 액션 아이템을 작업으로 변환
      await actionItems.locator('[data-testid="create-tasks"]').click();
      await expect(page.locator('[data-testid="tasks-created"]')).toContainText('2개의 작업이 생성되었습니다');
    });

    test('화이트보드/스케치 인식', async ({ page }) => {
      await page.goto('/whiteboard');
      
      // 화이트보드 캔버스
      const canvas = page.locator('[data-testid="whiteboard-canvas"]');
      await expect(canvas).toBeVisible();
      
      // 손글씨 도구 선택
      await page.locator('[data-testid="handwriting-tool"]').click();
      
      // 텍스트 작성 시뮬레이션
      await canvas.hover();
      await page.mouse.down();
      
      // 글씨 그리기 (시뮬레이션)
      const points = [
        { x: 100, y: 100 }, { x: 110, y: 95 }, { x: 120, y: 100 },
        { x: 130, y: 110 }, { x: 125, y: 120 }, { x: 115, y: 115 }
      ];
      
      for (const point of points) {
        await page.mouse.move(point.x, point.y);
        await page.waitForTimeout(10);
      }
      
      await page.mouse.up();
      
      // 손글씨 인식 트리거
      await page.locator('[data-testid="recognize-handwriting"]').click();
      
      // Mock 손글씨 인식 결과
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('handwritingRecognized', {
          detail: {
            text: '회의',
            confidence: 0.85,
            alternatives: ['최의', '회이', '회의']
          }
        }));
      });
      
      // 인식 결과
      const recognition = page.locator('[data-testid="handwriting-recognition"]');
      await expect(recognition).toBeVisible();
      await expect(recognition.locator('[data-testid="recognized-text"]')).toContainText('회의');
      await expect(recognition.locator('[data-testid="confidence"]')).toContainText('85%');
      
      // 대안 제시
      const alternatives = recognition.locator('[data-testid="alternatives"]');
      await expect(alternatives.locator('.alternative')).toHaveCount(3);
      
      // 수정 선택
      await alternatives.locator('[data-testid="select-alternative-2"]').click();
      
      // 텍스트 박스로 변환
      await page.locator('[data-testid="convert-to-text"]').click();
      await expect(canvas.locator('[data-testid="text-box"]')).toContainText('회의');
      
      // 도형 인식
      await page.locator('[data-testid="shape-tool"]').click();
      await canvas.hover();
      await page.mouse.down();
      
      // 사각형 그리기
      await page.mouse.move(200, 200);
      await page.mouse.move(300, 200);
      await page.mouse.move(300, 300);
      await page.mouse.move(200, 300);
      await page.mouse.move(200, 200);
      await page.mouse.up();
      
      // 도형 인식
      await page.locator('[data-testid="recognize-shapes"]').click();
      
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('shapeRecognized', {
          detail: {
            shape: 'rectangle',
            confidence: 0.92,
            bounds: { x: 200, y: 200, width: 100, height: 100 }
          }
        }));
      });
      
      // 정확한 도형으로 변환
      await expect(page.locator('[data-testid="shape-rectangle"]')).toBeVisible();
      await expect(page.locator('[data-testid="shape-perfect"]')).toHaveClass(/perfect-shape/);
    });
  });

  test.describe('비디오 회의 통합', () => {
    test('원클릭 화상회의 시작', async ({ page, context }) => {
      await page.goto('/calendar/event/1');
      
      // 회의 정보
      await expect(page.locator('[data-testid="event-title"]')).toContainText('팀 회의');
      
      // 화상회의 시작 버튼
      const videoButton = page.locator('[data-testid="start-video-call"]');
      await expect(videoButton).toBeVisible();
      await expect(videoButton).toContainText('화상회의 시작');
      
      // 카메라/마이크 설정 확인
      await videoButton.click();
      
      const setupModal = page.locator('[data-testid="video-setup-modal"]');
      await expect(setupModal).toBeVisible();
      
      // 디바이스 선택
      await expect(setupModal.locator('[data-testid="camera-select"]')).toBeVisible();
      await expect(setupModal.locator('[data-testid="microphone-select"]')).toBeVisible();
      
      // 미리보기
      const preview = setupModal.locator('[data-testid="camera-preview"]');
      await expect(preview).toBeVisible();
      
      // 오디오 테스트
      await setupModal.locator('[data-testid="test-microphone"]').click();
      await expect(setupModal.locator('[data-testid="audio-level"]')).toBeVisible();
      
      // 회의 참가
      await setupModal.locator('[data-testid="join-meeting"]').click();
      
      // 비디오 회의 인터페이스
      const videoInterface = page.locator('[data-testid="video-meeting-interface"]');
      await expect(videoInterface).toBeVisible();
      
      // 참가자 비디오
      await expect(videoInterface.locator('[data-testid="self-video"]')).toBeVisible();
      await expect(videoInterface.locator('[data-testid="participant-grid"]')).toBeVisible();
      
      // 컨트롤 버튼
      const controls = videoInterface.locator('[data-testid="meeting-controls"]');
      await expect(controls.locator('[data-testid="mute-audio"]')).toBeVisible();
      await expect(controls.locator('[data-testid="toggle-video"]')).toBeVisible();
      await expect(controls.locator('[data-testid="share-screen"]')).toBeVisible();
      await expect(controls.locator('[data-testid="end-call"]')).toBeVisible();
    });

    test('화면 공유 및 실시간 협업', async ({ page }) => {
      await page.goto('/video-meeting/active');
      
      // 화면 공유 시작
      await page.locator('[data-testid="share-screen"]').click();
      
      // 공유 옵션 선택
      const shareOptions = page.locator('[data-testid="share-options"]');
      await expect(shareOptions).toBeVisible();
      
      await shareOptions.locator('[data-testid="share-entire-screen"]').click();
      
      // 화면 공유 중 표시
      await expect(page.locator('[data-testid="sharing-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="sharing-indicator"]')).toContainText('화면 공유 중');
      
      // 공유 중 도구
      const shareTools = page.locator('[data-testid="share-tools"]');
      await expect(shareTools).toBeVisible();
      
      // 주석 도구
      await shareTools.locator('[data-testid="annotation-tool"]').click();
      await expect(page.locator('[data-testid="annotation-toolbar"]')).toBeVisible();
      
      // 펜 도구
      await page.locator('[data-testid="pen-tool"]').click();
      await page.locator('[data-testid="pen-red"]').click();
      
      // 그리기 (시뮬레이션)
      const sharedScreen = page.locator('[data-testid="shared-screen"]');
      await sharedScreen.hover();
      await page.mouse.down();
      await page.mouse.move(100, 100);
      await page.mouse.up();
      
      // 실시간 협업 확인
      await expect(page.locator('[data-testid="live-annotation"]')).toBeVisible();
      
      // 다른 참가자의 포인터
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('remotePointer', {
          detail: {
            user: '김팀장',
            position: { x: 200, y: 150 },
            color: '#00ff00'
          }
        }));
      });
      
      await expect(page.locator('[data-testid="remote-pointer-kim"]')).toBeVisible();
      
      // 화면 공유 종료
      await page.locator('[data-testid="stop-sharing"]').click();
      await expect(page.locator('[data-testid="sharing-stopped"]')).toContainText('화면 공유가 종료되었습니다');
    });

    test('AI 기반 회의 실시간 전사 및 요약', async ({ page }) => {
      await page.goto('/video-meeting/active');
      
      // 실시간 전사 시작
      await page.locator('[data-testid="start-transcription"]').click();
      
      const transcriptionPanel = page.locator('[data-testid="transcription-panel"]');
      await expect(transcriptionPanel).toBeVisible();
      
      // 화자 구분 전사
      await page.evaluate(() => {
        const events = [
          { speaker: '김팀장', text: '안녕하세요, 오늘 회의를 시작하겠습니다.', timestamp: '10:00:00' },
          { speaker: '박과장', text: '네, 지난주 진행 상황부터 공유드리겠습니다.', timestamp: '10:00:15' },
          { speaker: '이대리', text: '프로젝트 A는 90% 완료되었고, 예상보다 빨리 진행되고 있습니다.', timestamp: '10:00:30' }
        ];
        
        events.forEach((event, index) => {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('liveTranscription', { detail: event }));
          }, index * 1000);
        });
      });
      
      // 실시간 전사 표시
      await expect(transcriptionPanel.locator('[data-testid="transcript-1"]')).toContainText('김팀장: 안녕하세요');
      await expect(transcriptionPanel.locator('[data-testid="transcript-2"]')).toContainText('박과장: 네, 지난주');
      await expect(transcriptionPanel.locator('[data-testid="transcript-3"]')).toContainText('이대리: 프로젝트 A는');
      
      // 키워드 하이라이트
      await expect(transcriptionPanel.locator('[data-testid="keyword-project"]')).toHaveClass(/highlighted/);
      
      // 실시간 요약
      const summaryPanel = page.locator('[data-testid="live-summary"]');
      await summaryPanel.locator('[data-testid="toggle-summary"]').click();
      
      await expect(summaryPanel.locator('[data-testid="current-topic"]')).toContainText('프로젝트 진행 상황');
      await expect(summaryPanel.locator('[data-testid="key-points"]')).toContainText('프로젝트 A 90% 완료');
      
      // 액션 아이템 자동 감지
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('liveTranscription', {
          detail: {
            speaker: '김팀장',
            text: '박과장님은 다음 주까지 최종 보고서를 준비해주세요.',
            timestamp: '10:05:00'
          }
        }));
      });
      
      const actionItems = page.locator('[data-testid="detected-actions"]');
      await expect(actionItems).toBeVisible();
      await expect(actionItems.locator('[data-testid="action-1"]')).toContainText('박과장: 최종 보고서 준비');
      await expect(actionItems.locator('[data-testid="due-date-1"]')).toContainText('다음 주');
      
      // 회의 종료 시 자동 회의록 생성
      await page.locator('[data-testid="end-meeting"]').click();
      
      const meetingMinutes = page.locator('[data-testid="auto-generated-minutes"]');
      await expect(meetingMinutes).toBeVisible();
      await expect(meetingMinutes).toContainText('회의록이 자동 생성되었습니다');
      await expect(meetingMinutes.locator('[data-testid="download-minutes"]')).toBeVisible();
    });
  });

  test.describe('AR/VR 및 혼합 현실', () => {
    test('AR 캘린더 오버레이', async ({ page, context }) => {
      // WebXR 지원 확인
      await page.goto('/ar-calendar');
      
      await page.evaluate(() => {
        // WebXR API 모킹
        navigator.xr = {
          isSessionSupported: () => Promise.resolve(true),
          requestSession: () => Promise.resolve({
            addEventListener: () => {},
            end: () => Promise.resolve()
          })
        };
      });
      
      // AR 세션 시작
      await page.locator('[data-testid="start-ar-session"]').click();
      
      // AR 권한 요청
      await expect(page.locator('[data-testid="ar-permission-modal"]')).toBeVisible();
      await page.locator('[data-testid="allow-ar-access"]').click();
      
      // AR 캘린더 인터페이스
      const arInterface = page.locator('[data-testid="ar-calendar-interface"]');
      await expect(arInterface).toBeVisible();
      
      // 3D 캘린더 뷰
      await expect(arInterface.locator('[data-testid="3d-calendar"]')).toBeVisible();
      
      // 손 제스처 인식
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('handGesture', {
          detail: {
            gesture: 'pinch',
            confidence: 0.89,
            position: { x: 0.5, y: 0.3, z: -0.8 }
          }
        }));
      });
      
      // 제스처로 일정 선택
      await expect(page.locator('[data-testid="selected-event-ar"]')).toBeVisible();
      await expect(page.locator('[data-testid="event-details-ar"]')).toHaveClass(/floating/);
      
      // 공간 음성 명령
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('spatialVoice', {
          detail: {
            command: '내일 일정 보여줘',
            confidence: 0.92,
            direction: 'forward'
          }
        }));
      });
      
      await expect(page.locator('[data-testid="tomorrow-events-ar"]')).toBeVisible();
      
      // AR 세션 종료
      await page.locator('[data-testid="exit-ar"]').click();
      await expect(page.locator('[data-testid="ar-session-ended"]')).toContainText('AR 세션이 종료되었습니다');
    });

    test('VR 회의 공간', async ({ page }) => {
      await page.goto('/vr-meeting');
      
      // VR 지원 확인
      await page.evaluate(() => {
        navigator.xr = {
          isSessionSupported: () => Promise.resolve(true),
          requestSession: () => Promise.resolve({
            addEventListener: () => {},
            inputSources: [],
            requestReferenceSpace: () => Promise.resolve({}),
            requestAnimationFrame: (callback) => {
              requestAnimationFrame(callback);
            }
          })
        };
      });
      
      // VR 회의실 입장
      await page.locator('[data-testid="enter-vr-meeting"]').click();
      
      const vrInterface = page.locator('[data-testid="vr-meeting-interface"]');
      await expect(vrInterface).toBeVisible();
      
      // 가상 아바타
      await expect(vrInterface.locator('[data-testid="user-avatar"]')).toBeVisible();
      await expect(vrInterface.locator('[data-testid="participant-avatars"]')).toBeVisible();
      
      // 가상 회의실 환경
      await expect(vrInterface.locator('[data-testid="virtual-room"]')).toBeVisible();
      await expect(vrInterface.locator('[data-testid="virtual-whiteboard"]')).toBeVisible();
      
      // 컨트롤러 입력
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('vrController', {
          detail: {
            hand: 'right',
            button: 'trigger',
            position: { x: 0.2, y: 1.5, z: -0.5 },
            action: 'select'
          }
        }));
      });
      
      // 가상 객체 상호작용
      await expect(page.locator('[data-testid="selected-virtual-object"]')).toHaveClass(/selected/);
      
      // 3D 캘린더 조작
      const vrCalendar = vrInterface.locator('[data-testid="vr-calendar"]');
      await expect(vrCalendar).toBeVisible();
      
      // 손 추적으로 일정 드래그
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('handTracking', {
          detail: {
            gesture: 'grab',
            targetObject: 'calendar-event-1',
            startPosition: { x: 0.1, y: 1.2, z: -0.3 },
            currentPosition: { x: 0.3, y: 1.2, z: -0.3 }
          }
        }));
      });
      
      await expect(page.locator('[data-testid="vr-event-dragging"]')).toBeVisible();
      
      // VR 세션 종료
      await page.locator('[data-testid="exit-vr"]').click();
    });
  });

  test.describe('통합 멀티모달 워크플로우', () => {
    test('음성→이미지→텍스트 연속 워크플로우', async ({ page }) => {
      await page.goto('/dashboard');
      
      // 1단계: 음성으로 회의 생성
      await page.locator('[data-testid="voice-assistant"]').click();
      
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('voiceInput', {
          detail: {
            transcript: '내일 프로젝트 리뷰 미팅을 만들어줘',
            confidence: 0.93
          }
        }));
      });
      
      await page.locator('[data-testid="confirm-voice-event"]').click();
      
      // 2단계: 이미지로 회의 자료 추가
      const createdEvent = page.locator('[data-testid="created-event"]');
      await createdEvent.click();
      
      await page.setInputFiles('[data-testid="attach-image"]', {
        name: 'project-diagram.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-data')
      });
      
      // 이미지 분석
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('imageAnalyzed', {
          detail: {
            type: 'diagram',
            elements: ['flowchart', 'timeline', 'milestones'],
            text: 'Project Timeline: Phase 1 - Research, Phase 2 - Development, Phase 3 - Testing'
          }
        }));
      });
      
      await expect(page.locator('[data-testid="image-analysis"]')).toContainText('프로젝트 타임라인 감지');
      
      // 3단계: 텍스트로 세부사항 추가
      await page.locator('[data-testid="add-text-notes"]').click();
      await page.fill('[data-testid="notes-input"]', '이미지에서 확인된 3단계 프로세스를 바탕으로 현재 진행상황 점검');
      
      // 4단계: AI 통합 분석
      await page.locator('[data-testid="analyze-all-inputs"]').click();
      
      const analysis = page.locator('[data-testid="integrated-analysis"]');
      await expect(analysis).toBeVisible();
      await expect(analysis).toContainText('음성, 이미지, 텍스트 정보를 종합한 결과');
      await expect(analysis).toContainText('회의 아젠다 자동 생성');
      
      // 자동 생성된 아젠다
      const agenda = analysis.locator('[data-testid="auto-agenda"]');
      await expect(agenda.locator('.agenda-item')).toHaveCount(3);
      await expect(agenda).toContainText('Phase 1 진행상황 검토');
      
      // 5단계: 모든 정보 저장
      await page.locator('[data-testid="save-integrated-event"]').click();
      await expect(page.locator('[data-testid="workflow-complete"]')).toContainText('멀티모달 워크플로우 완료');
    });

    test('크로스 플랫폼 동기화', async ({ page, context, browser }) => {
      // 첫 번째 디바이스 (데스크톱)
      await page.goto('/dashboard');
      
      // 음성으로 일정 생성
      await page.locator('[data-testid="voice-assistant"]').click();
      
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('voiceInput', {
          detail: {
            transcript: '모바일에서 확인할 수 있는 중요한 회의 추가',
            confidence: 0.91
          }
        }));
      });
      
      await page.locator('[data-testid="confirm-voice-event"]').click();
      
      // 두 번째 디바이스 (모바일) 시뮬레이션
      const mobileContext = await browser.newContext({
        userAgent: 'Mobile Browser',
        viewport: { width: 375, height: 667 }
      });
      
      const mobilePage = await mobileContext.newPage();
      await setupAuthenticatedState(mobilePage, mobileContext);
      await mobilePage.goto('/mobile/dashboard');
      
      // 실시간 동기화 확인
      await expect(mobilePage.locator('[data-testid="synced-event"]')).toContainText('중요한 회의');
      
      // 모바일에서 이미지 추가
      await mobilePage.locator('[data-testid="add-photo"]').click();
      await mobilePage.setInputFiles('[data-testid="camera-input"]', {
        name: 'mobile-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('mobile-image-data')
      });
      
      // 데스크톱에서 실시간 업데이트 확인
      await expect(page.locator('[data-testid="mobile-photo-added"]')).toBeVisible();
      await expect(page.locator('[data-testid="sync-notification"]')).toContainText('모바일에서 사진이 추가되었습니다');
      
      // 데스크톱에서 텍스트 메모 추가
      await page.locator('[data-testid="add-note"]').click();
      await page.fill('[data-testid="note-input"]', '모바일에서 추가된 이미지 확인함');
      
      // 모바일에서 업데이트 확인
      await expect(mobilePage.locator('[data-testid="desktop-note-added"]')).toBeVisible();
      
      await mobileContext.close();
    });
  });
});