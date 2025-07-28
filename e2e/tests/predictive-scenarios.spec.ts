import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

/**
 * 🔮 예측 시나리오
 * AI 기반 미래 예측 및 스마트 제안 테스트
 */

test.describe('🤖 예측 분석 UX', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
  });

  test.describe('행동 패턴 분석', () => {
    test('사용자 활동 패턴 학습 및 예측', async ({ page, context }) => {
      await page.goto('/insights/patterns');
      
      // Mock 패턴 분석 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetUserPatterns') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                behaviorPatterns: {
                  dailyRhythm: {
                    peakHours: ['09:00-11:00', '14:00-16:00'],
                    lowEnergyHours: ['13:00-14:00', '17:00-18:00'],
                    prediction: {
                      tomorrowPeak: '10:30',
                      confidence: 0.87
                    }
                  },
                  meetingPatterns: {
                    averagePerDay: 4.2,
                    preferredDuration: 45,
                    cancelationRate: 0.15,
                    prediction: {
                      nextWeekMeetings: 18,
                      riskOverload: true
                    }
                  },
                  focusPatterns: {
                    averageFocusTime: 120,
                    bestFocusDays: ['Tuesday', 'Thursday'],
                    interruptionRate: 0.25,
                    prediction: {
                      nextWeekFocusAvailable: 8.5,
                      qualityScore: 0.72
                    }
                  }
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 패턴 시각화
      await expect(page.locator('[data-testid="pattern-dashboard"]')).toBeVisible();
      
      // 일일 리듬 분석
      const rhythmChart = page.locator('[data-testid="daily-rhythm-chart"]');
      await expect(rhythmChart).toBeVisible();
      await expect(rhythmChart.locator('[data-testid="peak-zone"]')).toHaveClass(/highlighted/);
      
      // 예측 정보
      await expect(page.locator('[data-testid="tomorrow-prediction"]')).toContainText('내일 최적 집중 시간: 10:30');
      await expect(page.locator('[data-testid="confidence-score"]')).toContainText('87% 확신');
      
      // 위험 알림
      const riskAlert = page.locator('[data-testid="overload-risk"]');
      await expect(riskAlert).toBeVisible();
      await expect(riskAlert).toContainText('다음 주 회의 과부하 위험');
      await expect(riskAlert).toHaveClass(/warning/);
      
      // 개선 제안
      await page.locator('[data-testid="show-suggestions"]').click();
      await expect(page.locator('[data-testid="suggestion-1"]')).toContainText('화요일과 목요일에 중요한 작업 배치');
      await expect(page.locator('[data-testid="suggestion-2"]')).toContainText('13-14시 점심시간 확보 권장');
    });

    test('계절적/주기적 패턴 감지', async ({ page, context }) => {
      await page.goto('/insights/cycles');
      
      // Mock 주기적 패턴 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetCyclicalPatterns') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                cyclicalPatterns: {
                  weekly: {
                    mondayBlues: { impact: 0.3, prediction: '다음 월요일 생산성 30% 감소 예상' },
                    fridayMomentum: { impact: -0.2, prediction: '금요일 오후 집중도 감소' }
                  },
                  monthly: {
                    monthEndRush: { 
                      intensity: 0.8, 
                      prediction: '월말 마지막 주에 업무량 80% 증가 예상',
                      nextOccurrence: '2024-01-29'
                    }
                  },
                  seasonal: {
                    winterProductivity: {
                      trend: 'increasing',
                      prediction: '겨울철 실내 활동 증가로 집중도 향상',
                      adjustment: '비타민D 부족 주의'
                    }
                  }
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 주기별 탭
      await page.locator('[data-testid="weekly-patterns"]').click();
      
      // 월요병 패턴
      const mondayPattern = page.locator('[data-testid="monday-blues"]');
      await expect(mondayPattern).toBeVisible();
      await expect(mondayPattern).toContainText('다음 월요일 생산성 30% 감소 예상');
      await expect(mondayPattern.locator('[data-testid="impact-meter"]')).toHaveAttribute('data-impact', '0.3');
      
      // 대응 전략 제안
      await mondayPattern.locator('[data-testid="view-countermeasures"]').click();
      const strategies = page.locator('[data-testid="monday-strategies"]');
      await expect(strategies).toBeVisible();
      await expect(strategies).toContainText('월요일 오전에 가벼운 작업 배치');
      await expect(strategies).toContainText('주말 휴식 시간 충분히 확보');
      
      // 월별 패턴
      await page.locator('[data-testid="monthly-patterns"]').click();
      const monthEndRush = page.locator('[data-testid="month-end-rush"]');
      await expect(monthEndRush).toContainText('월말 마지막 주에 업무량 80% 증가');
      
      // 예방적 조치
      await expect(page.locator('[data-testid="preventive-measures"]')).toContainText('미리 일정 분산 권장');
    });

    test('업무 스타일 진화 추적', async ({ page, context }) => {
      await page.goto('/insights/evolution');
      
      // Mock 진화 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetWorkStyleEvolution') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                workStyleEvolution: {
                  timeline: [
                    { period: '3개월 전', style: 'reactive', score: 0.4 },
                    { period: '2개월 전', style: 'structured', score: 0.6 },
                    { period: '1개월 전', style: 'proactive', score: 0.8 },
                    { period: '현재', style: 'strategic', score: 0.9 }
                  ],
                  predictions: {
                    nextMonth: {
                      style: 'masterful',
                      confidence: 0.73,
                      traits: ['고도의 시간 최적화', '예측적 계획', '균형 잡힌 워라밸']
                    }
                  },
                  recommendations: [
                    '리더십 역할 확대 고려',
                    '멘토링 활동 시작',
                    '시간 관리 강의 또는 블로그 작성'
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 진화 타임라인
      const timeline = page.locator('[data-testid="evolution-timeline"]');
      await expect(timeline).toBeVisible();
      await expect(timeline.locator('.timeline-item')).toHaveCount(4);
      
      // 현재 레벨
      const currentLevel = timeline.locator('[data-testid="current-level"]');
      await expect(currentLevel).toContainText('전략적 (Strategic)');
      await expect(currentLevel.locator('[data-testid="score"]')).toContainText('0.9');
      
      // 성장 그래프
      const growthChart = page.locator('[data-testid="growth-chart"]');
      await expect(growthChart).toBeVisible();
      await expect(growthChart.locator('[data-testid="trend-line"]')).toHaveClass(/upward/);
      
      // 미래 예측
      const prediction = page.locator('[data-testid="next-level-prediction"]');
      await expect(prediction).toContainText('숙련자 (Masterful)');
      await expect(prediction).toContainText('73% 확률');
      
      // 성장을 위한 추천
      const recommendations = page.locator('[data-testid="growth-recommendations"]');
      await expect(recommendations).toContainText('리더십 역할 확대');
      await expect(recommendations).toContainText('멘토링 활동 시작');
    });
  });

  test.describe('미래 일정 예측', () => {
    test('다음 주/월 일정 밀도 예측', async ({ page, context }) => {
      await page.goto('/calendar/forecast');
      
      // Mock 예측 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetScheduleForecast') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                scheduleForecast: {
                  nextWeek: {
                    totalHours: 45,
                    meetingHours: 18,
                    focusHours: 12,
                    bufferHours: 15,
                    density: 0.75,
                    stress: 'medium',
                    recommendations: [
                      '수요일 오후 회의 2개 목요일로 이동 제안',
                      '금요일 오후 집중 시간 확보'
                    ]
                  },
                  nextMonth: {
                    peakWeeks: [2, 4],
                    lightWeeks: [1, 3],
                    majorDeadlines: [
                      { name: '프로젝트 A 마감', date: '2024-02-15', impact: 'high' },
                      { name: '분기 리포트', date: '2024-02-28', impact: 'medium' }
                    ]
                  }
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 다음 주 예측
      const weekForecast = page.locator('[data-testid="week-forecast"]');
      await expect(weekForecast).toBeVisible();
      
      // 일정 밀도 표시
      const densityMeter = weekForecast.locator('[data-testid="density-meter"]');
      await expect(densityMeter).toHaveAttribute('data-density', '0.75');
      await expect(densityMeter).toHaveClass(/medium-stress/);
      
      // 시간 분배
      await expect(weekForecast.locator('[data-testid="meeting-hours"]')).toContainText('18시간');
      await expect(weekForecast.locator('[data-testid="focus-hours"]')).toContainText('12시간');
      
      // 최적화 제안
      const optimization = weekForecast.locator('[data-testid="optimization-suggestions"]');
      await expect(optimization).toBeVisible();
      await expect(optimization).toContainText('수요일 오후 회의 2개 목요일로 이동');
      
      // 월별 전망
      await page.locator('[data-testid="month-forecast-tab"]').click();
      const monthForecast = page.locator('[data-testid="month-forecast"]');
      
      // 피크 주간 표시
      await expect(monthForecast.locator('[data-testid="peak-week-2"]')).toHaveClass(/peak/);
      await expect(monthForecast.locator('[data-testid="peak-week-4"]')).toHaveClass(/peak/);
      
      // 주요 마감일
      const deadlines = monthForecast.locator('[data-testid="major-deadlines"]');
      await expect(deadlines.locator('[data-testid="deadline-high-impact"]')).toBeVisible();
    });

    test('회의 패턴 및 충돌 예측', async ({ page, context }) => {
      await page.goto('/calendar/meeting-forecast');
      
      // Mock 회의 예측 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetMeetingForecast') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                meetingForecast: {
                  patterns: {
                    recurringMeetings: 12,
                    adHocMeetings: 6,
                    totalPredicted: 18,
                    confidence: 0.82
                  },
                  conflicts: [
                    {
                      type: 'double_booking',
                      probability: 0.3,
                      date: '2024-02-01T14:00:00Z',
                      meetings: ['팀 회의', '클라이언트 콜']
                    },
                    {
                      type: 'back_to_back',
                      probability: 0.7,
                      date: '2024-02-02T10:00:00Z',
                      impact: 'no_break_time'
                    }
                  ],
                  suggestions: [
                    {
                      type: 'proactive_scheduling',
                      message: '화요일 오전에 버퍼 시간 30분 추가 권장',
                      benefit: '이동 시간 확보 및 스트레스 감소'
                    }
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 회의 예측 요약
      const forecastSummary = page.locator('[data-testid="meeting-forecast-summary"]');
      await expect(forecastSummary).toBeVisible();
      await expect(forecastSummary).toContainText('다음 주 예상 회의: 18개');
      await expect(forecastSummary).toContainText('신뢰도: 82%');
      
      // 충돌 위험 알림
      const conflictAlerts = page.locator('[data-testid="conflict-alerts"]');
      await expect(conflictAlerts.locator('.conflict-item')).toHaveCount(2);
      
      // 더블 부킹 위험
      const doubleBooking = conflictAlerts.locator('[data-testid="conflict-double-booking"]');
      await expect(doubleBooking).toContainText('30% 확률로 더블 부킹 위험');
      await expect(doubleBooking).toHaveClass(/medium-risk/);
      
      // 예방적 제안
      await doubleBooking.locator('[data-testid="view-prevention"]').click();
      const prevention = page.locator('[data-testid="prevention-modal"]');
      await expect(prevention).toBeVisible();
      await expect(prevention).toContainText('미리 우선순위 설정');
      
      // 백투백 회의 위험
      const backToBack = conflictAlerts.locator('[data-testid="conflict-back-to-back"]');
      await expect(backToBack).toContainText('70% 확률로 연속 회의');
      await expect(backToBack).toHaveClass(/high-risk/);
    });

    test('워크로드 밸런스 예측', async ({ page, context }) => {
      await page.goto('/insights/workload-forecast');
      
      // Mock 워크로드 예측
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetWorkloadForecast') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                workloadForecast: {
                  daily: [
                    { date: '2024-01-29', load: 0.9, risk: 'high' },
                    { date: '2024-01-30', load: 0.6, risk: 'low' },
                    { date: '2024-01-31', load: 0.8, risk: 'medium' },
                    { date: '2024-02-01', load: 0.95, risk: 'critical' },
                    { date: '2024-02-02', load: 0.4, risk: 'low' }
                  ],
                  burnoutRisk: {
                    score: 0.7,
                    factors: ['연속 고강도 업무', '휴식 시간 부족', '야근 증가'],
                    timeline: '2주 후'
                  },
                  balanceRecommendations: [
                    {
                      action: 'delegate_tasks',
                      description: '2월 1일 업무 일부를 팀원에게 위임',
                      impact: '부하 20% 감소'
                    },
                    {
                      action: 'reschedule_meetings',
                      description: '비필수 회의를 다음 주로 연기',
                      impact: '집중 시간 2시간 확보'
                    }
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 워크로드 히트맵
      const workloadChart = page.locator('[data-testid="workload-heatmap"]');
      await expect(workloadChart).toBeVisible();
      
      // 위험일 표시
      const criticalDay = workloadChart.locator('[data-testid="day-2024-02-01"]');
      await expect(criticalDay).toHaveClass(/critical/);
      await expect(criticalDay).toHaveAttribute('data-load', '0.95');
      
      // 번아웃 위험 알림
      const burnoutAlert = page.locator('[data-testid="burnout-risk"]');
      await expect(burnoutAlert).toBeVisible();
      await expect(burnoutAlert).toContainText('번아웃 위험: 70%');
      await expect(burnoutAlert).toContainText('2주 후');
      await expect(burnoutAlert).toHaveClass(/high-risk/);
      
      // 위험 요인
      const riskFactors = burnoutAlert.locator('[data-testid="risk-factors"]');
      await expect(riskFactors).toContainText('연속 고강도 업무');
      await expect(riskFactors).toContainText('휴식 시간 부족');
      
      // 밸런스 개선 제안
      const recommendations = page.locator('[data-testid="balance-recommendations"]');
      await expect(recommendations.locator('.recommendation')).toHaveCount(2);
      
      // 위임 제안
      const delegateRec = recommendations.locator('[data-testid="rec-delegate"]');
      await expect(delegateRec).toContainText('업무 일부를 팀원에게 위임');
      await expect(delegateRec.locator('[data-testid="impact"]')).toContainText('부하 20% 감소');
    });
  });

  test.describe('리스크 및 기회 감지', () => {
    test('일정 위험 요소 조기 감지', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Mock 위험 감지 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetRiskAnalysis') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                riskAnalysis: {
                  immediateRisks: [
                    {
                      type: 'deadline_miss',
                      probability: 0.8,
                      timeline: '3일 후',
                      project: '프로젝트 A',
                      impact: 'high',
                      cause: '의존성 작업 지연'
                    }
                  ],
                  weeklyRisks: [
                    {
                      type: 'overcommitment',
                      probability: 0.6,
                      description: '이번 주 약속 개수가 평균의 150%',
                      mitigation: '3개 회의 다음 주 이동 제안'
                    }
                  ],
                  opportunityWindows: [
                    {
                      type: 'free_time',
                      duration: '2시간',
                      date: '2024-02-01T14:00:00Z',
                      suggestion: '중요 프로젝트 집중 작업 시간으로 활용'
                    }
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 위험 알림 패널
      const riskPanel = page.locator('[data-testid="risk-alerts"]');
      await expect(riskPanel).toBeVisible();
      
      // 즉시 위험
      const immediateRisk = riskPanel.locator('[data-testid="immediate-risk"]');
      await expect(immediateRisk).toBeVisible();
      await expect(immediateRisk).toHaveClass(/high-priority/);
      await expect(immediateRisk).toContainText('마감일 놓칠 위험 80%');
      await expect(immediateRisk).toContainText('프로젝트 A');
      
      // 위험 상세 정보
      await immediateRisk.locator('[data-testid="view-details"]').click();
      const riskModal = page.locator('[data-testid="risk-details-modal"]');
      await expect(riskModal).toBeVisible();
      await expect(riskModal).toContainText('의존성 작업 지연');
      
      // 대응 방안
      const mitigations = riskModal.locator('[data-testid="mitigation-options"]');
      await expect(mitigations).toBeVisible();
      await expect(mitigations).toContainText('대체 계획 활성화');
      
      // 기회 포착
      const opportunityAlert = page.locator('[data-testid="opportunity-alert"]');
      await expect(opportunityAlert).toBeVisible();
      await expect(opportunityAlert).toContainText('2시간 여유 시간 발견');
      await expect(opportunityAlert).toHaveClass(/positive/);
    });

    test('팀 리소스 부족 예측', async ({ page, context }) => {
      await page.goto('/team/resource-forecast');
      
      // Mock 리소스 예측
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetResourceForecast') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                resourceForecast: {
                  teamCapacity: {
                    current: 0.85,
                    nextWeek: 0.95,
                    bottlenecks: [
                      {
                        member: '김개발자',
                        overload: 1.2,
                        skillArea: 'Frontend',
                        impact: 'critical'
                      }
                    ]
                  },
                  skillGaps: [
                    {
                      skill: 'React 최신 버전',
                      demandIncrease: 0.4,
                      timeline: '2주 후',
                      suggestion: '교육 프로그램 또는 외부 채용'
                    }
                  ],
                  rebalancing: [
                    {
                      action: 'task_redistribution',
                      description: '김개발자 업무 일부를 박개발자에게 이양',
                      effort: '4시간',
                      benefit: '팀 밸런스 20% 개선'
                    }
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 팀 용량 현황
      const capacityDashboard = page.locator('[data-testid="team-capacity"]');
      await expect(capacityDashboard).toBeVisible();
      
      // 현재 vs 예측 용량
      await expect(capacityDashboard.locator('[data-testid="current-capacity"]')).toContainText('85%');
      await expect(capacityDashboard.locator('[data-testid="predicted-capacity"]')).toContainText('95%');
      await expect(capacityDashboard.locator('[data-testid="capacity-trend"]')).toHaveClass(/increasing/);
      
      // 병목 지점
      const bottleneck = page.locator('[data-testid="bottleneck-kim"]');
      await expect(bottleneck).toBeVisible();
      await expect(bottleneck).toHaveClass(/critical/);
      await expect(bottleneck).toContainText('김개발자: 120% 과부하');
      
      // 스킬 갭 예측
      const skillGaps = page.locator('[data-testid="skill-gaps"]');
      await expect(skillGaps).toBeVisible();
      await expect(skillGaps).toContainText('React 최신 버전 수요 40% 증가');
      
      // 리밸런싱 제안
      const rebalancing = page.locator('[data-testid="rebalancing-suggestions"]');
      await expect(rebalancing).toBeVisible();
      await expect(rebalancing).toContainText('업무 재분배로 밸런스 20% 개선');
      
      // 제안 적용
      await rebalancing.locator('[data-testid="apply-rebalancing"]').click();
      await expect(page.locator('[data-testid="rebalancing-preview"]')).toBeVisible();
    });

    test('외부 요인 영향 분석', async ({ page, context }) => {
      await page.goto('/insights/external-factors');
      
      // Mock 외부 요인 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetExternalFactors') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                externalFactors: {
                  calendar: {
                    holidays: [
                      {
                        name: '신정',
                        date: '2024-01-01',
                        impact: '업무일 감소',
                        adjustment: '이전 주 업무량 증가 예상'
                      }
                    ],
                    events: [
                      {
                        name: '컨퍼런스 시즌',
                        period: '2024-03-01 ~ 2024-03-31',
                        impact: '출장 및 외부 미팅 증가'
                      }
                    ]
                  },
                  weather: {
                    forecast: [
                      {
                        date: '2024-02-01',
                        condition: '눈',
                        impact: '출근 지연 및 외부 미팅 취소 가능성',
                        adjustment: '재택근무 권장'
                      }
                    ]
                  },
                  company: {
                    events: [
                      {
                        name: '분기 결산',
                        date: '2024-03-31',
                        impact: '회계팀 업무량 급증',
                        rippleEffect: '다른 팀 지원 요청 증가'
                      }
                    ]
                  }
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 외부 요인 대시보드
      const externalDashboard = page.locator('[data-testid="external-factors-dashboard"]');
      await expect(externalDashboard).toBeVisible();
      
      // 날씨 영향
      const weatherImpact = page.locator('[data-testid="weather-impact"]');
      await expect(weatherImpact).toBeVisible();
      await expect(weatherImpact).toContainText('2월 1일 눈 예보');
      await expect(weatherImpact).toContainText('재택근무 권장');
      
      // 회사 이벤트
      const companyEvents = page.locator('[data-testid="company-events"]');
      await expect(companyEvents).toContainText('분기 결산');
      await expect(companyEvents).toContainText('다른 팀 지원 요청 증가');
      
      // 적응 제안
      const adaptations = page.locator('[data-testid="adaptation-suggestions"]');
      await expect(adaptations).toBeVisible();
      await expect(adaptations).toContainText('미리 재택근무 환경 점검');
      
      // 영향도 점수
      await expect(page.locator('[data-testid="impact-score"]')).toContainText('중간');
    });
  });

  test.describe('스마트 제안 엔진', () => {
    test('컨텍스트 기반 실시간 제안', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 실시간 제안 웹소켓 시뮬레이션
      await page.evaluate(() => {
        window.mockWebSocket = {
          send: () => {},
          onmessage: null
        };
      });
      
      // 현재 상황에 맞는 제안
      await page.evaluate(() => {
        const suggestion = {
          type: 'context_aware',
          priority: 'high',
          title: '지금이 집중 시간입니다',
          description: '다음 2시간 동안 중요한 작업에 집중하세요',
          reasoning: '과거 데이터 분석 결과 현재 시간대가 가장 생산적',
          actions: [
            { type: 'enable_focus_mode', label: '집중 모드 켜기' },
            { type: 'block_notifications', label: '알림 차단' },
            { type: 'suggest_tasks', label: '우선순위 작업 보기' }
          ]
        };
        
        window.mockWebSocket.onmessage?.({
          data: JSON.stringify(suggestion)
        });
      });
      
      // 실시간 제안 팝업
      const suggestion = page.locator('[data-testid="smart-suggestion"]');
      await expect(suggestion).toBeVisible();
      await expect(suggestion).toContainText('지금이 집중 시간입니다');
      
      // 제안 근거
      await suggestion.locator('[data-testid="show-reasoning"]').click();
      const reasoning = page.locator('[data-testid="suggestion-reasoning"]');
      await expect(reasoning).toContainText('과거 데이터 분석 결과');
      
      // 액션 버튼
      await expect(suggestion.locator('[data-testid="action-focus-mode"]')).toBeVisible();
      await suggestion.locator('[data-testid="action-focus-mode"]').click();
      
      // 집중 모드 활성화
      await expect(page.locator('[data-testid="focus-mode-active"]')).toBeVisible();
      await expect(page.locator('[data-testid="focus-timer"]')).toContainText('2:00:00');
    });

    test('학습 기반 개인화 제안', async ({ page, context }) => {
      await page.goto('/ai-assistant');
      
      // Mock 개인화 제안
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetPersonalizedSuggestions') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                personalizedSuggestions: {
                  daily: [
                    {
                      id: 'morning_routine',
                      confidence: 0.9,
                      title: '오늘의 모닝 루틴',
                      description: '커피 마시며 이메일 확인 → 중요 작업 1개 선택',
                      basedOn: '지난 30일 성공 패턴 분석',
                      expectedBenefit: '생산성 25% 향상'
                    }
                  ],
                  weekly: [
                    {
                      id: 'meeting_optimization',
                      confidence: 0.75,
                      title: '회의 효율성 개선',
                      description: '화요일 오후 회의들을 오전으로 이동',
                      basedOn: '화요일 오후 집중도 하락 패턴',
                      expectedBenefit: '집중 시간 3시간 확보'
                    }
                  ],
                  adaptive: [
                    {
                      id: 'stress_management',
                      trigger: 'high_stress_detected',
                      title: '스트레스 관리 제안',
                      description: '5분 명상 또는 산책',
                      basedOn: '심박수 및 활동 패턴 분석',
                      urgency: 'immediate'
                    }
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 개인화 제안 섹션
      const suggestions = page.locator('[data-testid="personalized-suggestions"]');
      await expect(suggestions).toBeVisible();
      
      // 일일 제안
      const dailySuggestion = suggestions.locator('[data-testid="daily-suggestion"]');
      await expect(dailySuggestion).toContainText('오늘의 모닝 루틴');
      await expect(dailySuggestion.locator('[data-testid="confidence"]')).toContainText('90%');
      await expect(dailySuggestion.locator('[data-testid="benefit"]')).toContainText('생산성 25% 향상');
      
      // 학습 근거
      await dailySuggestion.locator('[data-testid="view-basis"]').click();
      const basis = page.locator('[data-testid="learning-basis"]');
      await expect(basis).toContainText('지난 30일 성공 패턴 분석');
      
      // 적응형 제안 (긴급)
      const adaptiveSuggestion = suggestions.locator('[data-testid="adaptive-suggestion"]');
      await expect(adaptiveSuggestion).toHaveClass(/urgent/);
      await expect(adaptiveSuggestion).toContainText('스트레스 관리 제안');
      
      // 제안 수락/거절
      await dailySuggestion.locator('[data-testid="accept-suggestion"]').click();
      await expect(page.locator('[data-testid="suggestion-accepted"]')).toContainText('제안이 일정에 추가되었습니다');
      
      // 피드백 학습
      await page.locator('[data-testid="rate-suggestion"]').click();
      await page.locator('[data-testid="rating-5-stars"]').click();
      await page.fill('[data-testid="feedback-comment"]', '정말 도움됐어요!');
      await page.locator('[data-testid="submit-feedback"]').click();
      
      await expect(page.locator('[data-testid="feedback-thanks"]')).toContainText('피드백이 AI 학습에 반영됩니다');
    });

    test('예측 기반 선제적 알림', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Mock 선제적 알림
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetProactiveAlerts') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                proactiveAlerts: [
                  {
                    id: 'traffic_delay',
                    type: 'travel_optimization',
                    priority: 'medium',
                    title: '교통 체증 예상',
                    description: '오후 3시 회의를 위해 2:30에 출발하세요',
                    prediction: {
                      normalTime: 20,
                      predictedTime: 35,
                      confidence: 0.8
                    },
                    suggestion: '대중교통 이용 시 45분 단축 가능'
                  },
                  {
                    id: 'deadline_approaching',
                    type: 'deadline_management',
                    priority: 'high',
                    title: '마감일 임박',
                    description: '프로젝트 X 마감까지 3일, 현재 진행률 60%',
                    prediction: {
                      completionDate: '2024-02-03',
                      deadline: '2024-02-02',
                      riskLevel: 'high'
                    },
                    suggestion: '추가 리소스 투입 또는 범위 조정 필요'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 선제적 알림 센터
      await page.locator('[data-testid="proactive-alerts"]').click();
      
      const alertCenter = page.locator('[data-testid="alert-center"]');
      await expect(alertCenter).toBeVisible();
      
      // 교통 알림
      const trafficAlert = alertCenter.locator('[data-testid="alert-traffic_delay"]');
      await expect(trafficAlert).toBeVisible();
      await expect(trafficAlert).toHaveClass(/medium-priority/);
      await expect(trafficAlert).toContainText('2:30에 출발하세요');
      
      // 예측 상세
      await trafficAlert.locator('[data-testid="view-prediction"]').click();
      const predictionDetails = page.locator('[data-testid="prediction-details"]');
      await expect(predictionDetails).toContainText('평소 20분 → 예상 35분');
      await expect(predictionDetails).toContainText('신뢰도 80%');
      
      // 마감일 알림 (고우선순위)
      const deadlineAlert = alertCenter.locator('[data-testid="alert-deadline_approaching"]');
      await expect(deadlineAlert).toHaveClass(/high-priority/);
      await expect(deadlineAlert).toHaveClass(/urgent/);
      
      // 알림 스누즈
      await trafficAlert.locator('[data-testid="snooze-alert"]').click();
      await page.locator('[data-testid="snooze-30min"]').click();
      
      await expect(page.locator('[data-testid="alert-snoozed"]')).toContainText('30분 후 다시 알림');
    });
  });
});