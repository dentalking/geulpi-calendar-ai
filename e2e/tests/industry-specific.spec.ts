import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

/**
 * 🏢 산업별 특화 시나리오
 * 의료, 교육, 법무, 제조업 등 각 산업의 특수한 요구사항을 반영한 테스트
 */

test.describe('🏥 산업별 특화 UX', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
  });

  test.describe('의료 산업', () => {
    test('환자 진료 스케줄링 및 HIPAA 준수', async ({ page, context }) => {
      // 의료 모드 설정
      await page.goto('/settings/industry');
      await page.selectOption('[data-testid="industry-type"]', 'healthcare');
      await page.check('[data-testid="hipaa-compliance"]');
      
      await page.goto('/medical/scheduling');
      
      // Mock 환자 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetPatients') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                patients: [
                  {
                    id: 'p001',
                    name: '김○○',
                    maskedId: 'P***001',
                    birthYear: '198*',
                    lastVisit: '2024-01-15',
                    condition: '정기검진',
                    urgency: 'routine'
                  },
                  {
                    id: 'p002',
                    name: '이○○',
                    maskedId: 'P***002',
                    birthYear: '196*',
                    lastVisit: '2024-01-20',
                    condition: '응급처치',
                    urgency: 'urgent'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 환자 정보 마스킹 확인
      const patientList = page.locator('[data-testid="patient-list"]');
      await expect(patientList).toBeVisible();
      await expect(patientList.locator('[data-testid="patient-name-1"]')).toContainText('김○○');
      await expect(patientList.locator('[data-testid="patient-id-1"]')).toContainText('P***001');
      
      // 진료 예약 생성
      await page.locator('[data-testid="schedule-appointment"]').click();
      
      const appointmentForm = page.locator('[data-testid="appointment-form"]');
      await expect(appointmentForm).toBeVisible();
      
      // 환자 검색 (보안 검색)
      await page.fill('[data-testid="patient-search"]', '김');
      await expect(page.locator('[data-testid="search-results"]')).toContainText('최소 3글자 이상 입력하세요');
      
      await page.fill('[data-testid="patient-search"]', '김○○');
      await page.locator('[data-testid="select-patient-1"]').click();
      
      // 진료 유형 선택
      await page.selectOption('[data-testid="appointment-type"]', 'consultation');
      await page.selectOption('[data-testid="urgency-level"]', 'routine');
      
      // 시간 슬롯 (의료진별 가용 시간)
      await page.selectOption('[data-testid="doctor-select"]', 'dr-kim');
      
      const availableSlots = page.locator('[data-testid="available-slots"]');
      await expect(availableSlots).toBeVisible();
      await expect(availableSlots.locator('[data-testid="slot-30min"]')).toContainText('30분 진료');
      
      // HIPAA 동의 확인
      const hipaaConsent = page.locator('[data-testid="hipaa-consent"]');
      await expect(hipaaConsent).toBeVisible();
      await expect(hipaaConsent).toContainText('개인정보 처리 동의');
      await hipaaConsent.locator('[data-testid="consent-checkbox"]').check();
      
      // 예약 생성
      await page.locator('[data-testid="create-appointment"]').click();
      
      // 보안 로깅 확인
      await expect(page.locator('[data-testid="audit-logged"]')).toContainText('접근 기록이 감사 로그에 저장되었습니다');
      
      // 예약 확인서 (환자 정보 마스킹)
      const confirmation = page.locator('[data-testid="appointment-confirmation"]');
      await expect(confirmation).toBeVisible();
      await expect(confirmation).toContainText('예약이 완료되었습니다');
      await expect(confirmation).toContainText('환자: 김○○');
    });

    test('응급실 트리아지 시스템', async ({ page, context }) => {
      await page.goto('/emergency/triage');
      
      // Mock 응급 환자 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetEmergencyQueue') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                emergencyQueue: [
                  {
                    id: 'er001',
                    arrivalTime: '2024-02-01T14:30:00Z',
                    triageLevel: 1,
                    symptoms: '흉통, 호흡곤란',
                    vitalSigns: { bp: '180/120', hr: '110', temp: '37.2' },
                    waitTime: '0분',
                    status: 'immediate'
                  },
                  {
                    id: 'er002',
                    arrivalTime: '2024-02-01T14:45:00Z',
                    triageLevel: 3,
                    symptoms: '복통',
                    vitalSigns: { bp: '120/80', hr: '85', temp: '36.8' },
                    waitTime: '45분',
                    status: 'waiting'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 트리아지 대시보드
      const triageDashboard = page.locator('[data-testid="triage-dashboard"]');
      await expect(triageDashboard).toBeVisible();
      
      // 우선순위별 환자 분류
      const level1Patients = triageDashboard.locator('[data-testid="level-1-patients"]');
      await expect(level1Patients).toHaveClass(/critical/);
      await expect(level1Patients).toContainText('즉시 처치');
      
      const level3Patients = triageDashboard.locator('[data-testid="level-3-patients"]');
      await expect(level3Patients).toHaveClass(/moderate/);
      
      // 실시간 대기시간 업데이트
      await expect(page.locator('[data-testid="wait-time-er002"]')).toContainText('45분');
      
      // 새 응급환자 등록
      await page.locator('[data-testid="register-emergency"]').click();
      
      const emergencyForm = page.locator('[data-testid="emergency-form"]');
      await expect(emergencyForm).toBeVisible();
      
      // 빠른 트리아지 평가
      await page.fill('[data-testid="chief-complaint"]', '교통사고 외상');
      await page.selectOption('[data-testid="consciousness-level"]', 'alert');
      await page.fill('[data-testid="pain-scale"]', '8');
      
      // 자동 트리아지 레벨 계산
      const calculatedLevel = page.locator('[data-testid="calculated-triage-level"]');
      await expect(calculatedLevel).toBeVisible();
      await expect(calculatedLevel).toContainText('레벨 2 (긴급)');
      await expect(calculatedLevel).toHaveClass(/urgent/);
      
      // 담당 의료진 자동 배정
      await expect(page.locator('[data-testid="assigned-doctor"]')).toContainText('외상외과 김의사');
      
      // 예상 처치 시간
      await expect(page.locator('[data-testid="estimated-treatment-time"]')).toContainText('15분 내 처치 시작');
    });

    test('수술실 스케줄링 및 리소스 관리', async ({ page, context }) => {
      await page.goto('/surgery/scheduling');
      
      // Mock 수술실 및 장비 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetORResources') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                operatingRooms: [
                  {
                    id: 'or1',
                    name: '수술실 1',
                    type: 'general',
                    equipment: ['내시경', '심전도'],
                    availability: [
                      { start: '08:00', end: '12:00', status: 'available' },
                      { start: '13:00', end: '17:00', status: 'booked' }
                    ]
                  },
                  {
                    id: 'or2',
                    name: '수술실 2',
                    type: 'cardiac',
                    equipment: ['심폐순환기', '제세동기'],
                    availability: [
                      { start: '09:00', end: '15:00', status: 'maintenance' }
                    ]
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 수술실 현황 대시보드
      const orDashboard = page.locator('[data-testid="or-dashboard"]');
      await expect(orDashboard).toBeVisible();
      
      // 수술실별 상태 표시
      const or1Status = orDashboard.locator('[data-testid="or1-status"]');
      await expect(or1Status.locator('[data-testid="morning-slot"]')).toHaveClass(/available/);
      await expect(or1Status.locator('[data-testid="afternoon-slot"]')).toHaveClass(/booked/);
      
      const or2Status = orDashboard.locator('[data-testid="or2-status"]');
      await expect(or2Status).toHaveClass(/maintenance/);
      
      // 수술 예약 생성
      await page.locator('[data-testid="schedule-surgery"]').click();
      
      const surgeryForm = page.locator('[data-testid="surgery-form"]');
      await expect(surgeryForm).toBeVisible();
      
      // 수술 유형 선택
      await page.selectOption('[data-testid="surgery-type"]', 'appendectomy');
      
      // 예상 소요 시간 자동 계산
      await expect(page.locator('[data-testid="estimated-duration"]')).toContainText('2-3시간');
      
      // 필요 장비 자동 매칭
      const requiredEquipment = page.locator('[data-testid="required-equipment"]');
      await expect(requiredEquipment).toContainText('내시경');
      await expect(requiredEquipment).toContainText('복강경');
      
      // 가용한 수술실 필터링
      const availableORs = page.locator('[data-testid="available-ors"]');
      await expect(availableORs.locator('[data-testid="or1-option"]')).toBeVisible();
      await expect(availableORs.locator('[data-testid="or2-option"]')).not.toBeVisible(); // 심장수술용이므로 제외
      
      // 의료진 배정
      await page.selectOption('[data-testid="primary-surgeon"]', 'dr-lee');
      await page.selectOption('[data-testid="anesthesiologist"]', 'dr-park');
      
      // 수술 전 체크리스트
      const preOpChecklist = page.locator('[data-testid="pre-op-checklist"]');
      await expect(preOpChecklist).toBeVisible();
      await preOpChecklist.locator('[data-testid="consent-form"]').check();
      await preOpChecklist.locator('[data-testid="lab-results"]').check();
      await preOpChecklist.locator('[data-testid="imaging-complete"]').check();
      
      // 수술 예약 확정
      await page.locator('[data-testid="confirm-surgery"]').click();
      await expect(page.locator('[data-testid="surgery-scheduled"]')).toContainText('수술이 예약되었습니다');
    });
  });

  test.describe('교육 산업', () => {
    test('학급 시간표 관리 및 교육과정 스케줄링', async ({ page, context }) => {
      await page.goto('/settings/industry');
      await page.selectOption('[data-testid="industry-type"]', 'education');
      
      await page.goto('/education/timetable');
      
      // Mock 교육 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetCurriculum') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                curriculum: {
                  subjects: [
                    { id: 'math', name: '수학', hours: 4, level: 'advanced' },
                    { id: 'science', name: '과학', hours: 3, level: 'intermediate' },
                    { id: 'korean', name: '국어', hours: 5, level: 'standard' },
                    { id: 'english', name: '영어', hours: 4, level: 'standard' }
                  ],
                  teachers: [
                    { id: 't1', name: '김선생님', subjects: ['math'], availability: 'mon,tue,wed,thu,fri' },
                    { id: 't2', name: '이선생님', subjects: ['science'], availability: 'mon,wed,fri' },
                    { id: 't3', name: '박선생님', subjects: ['korean', 'english'], availability: 'all' }
                  ],
                  classrooms: [
                    { id: 'r1', name: '1-1교실', capacity: 30, equipment: ['projector', 'computer'] },
                    { id: 'r2', name: '과학실', capacity: 25, equipment: ['lab_equipment', 'projector'] }
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 시간표 생성 마법사
      const timetableWizard = page.locator('[data-testid="timetable-wizard"]');
      await expect(timetableWizard).toBeVisible();
      
      // 학급 정보 입력
      await page.fill('[data-testid="class-name"]', '3학년 1반');
      await page.fill('[data-testid="student-count"]', '28');
      
      // 과목별 시수 설정
      const subjectHours = page.locator('[data-testid="subject-hours"]');
      await expect(subjectHours.locator('[data-testid="math-hours"]')).toHaveValue('4');
      await expect(subjectHours.locator('[data-testid="science-hours"]')).toHaveValue('3');
      
      // 자동 시간표 생성
      await page.locator('[data-testid="auto-generate-timetable"]').click();
      
      // 시간표 최적화 옵션
      const optimizationOptions = page.locator('[data-testid="optimization-options"]');
      await expect(optimizationOptions).toBeVisible();
      await optimizationOptions.locator('[data-testid="avoid-consecutive-same-subject"]').check();
      await optimizationOptions.locator('[data-testid="consider-student-attention-span"]').check();
      
      // 생성 결과
      const generatedTimetable = page.locator('[data-testid="generated-timetable"]');
      await expect(generatedTimetable).toBeVisible();
      
      // 충돌 검사 결과
      await expect(page.locator('[data-testid="conflict-check"]')).toContainText('충돌 없음');
      
      // 교사 배정 확인
      await expect(generatedTimetable.locator('[data-testid="mon-1-math"]')).toContainText('김선생님');
      
      // 교실 배정 확인
      await expect(generatedTimetable.locator('[data-testid="tue-3-science"]')).toContainText('과학실');
      
      // 시간표 수정
      await generatedTimetable.locator('[data-testid="wed-2-korean"]').click();
      
      const editSlot = page.locator('[data-testid="edit-time-slot"]');
      await expect(editSlot).toBeVisible();
      await page.selectOption('[data-testid="change-subject"]', 'english');
      await page.selectOption('[data-testid="change-teacher"]', 't3');
      
      // 연쇄 영향 확인
      const chainEffect = page.locator('[data-testid="chain-effect-warning"]');
      await expect(chainEffect).toBeVisible();
      await expect(chainEffect).toContainText('이 변경으로 3개의 다른 시간이 영향받습니다');
      
      // 승인 및 적용
      await page.locator('[data-testid="apply-changes"]').click();
      await expect(page.locator('[data-testid="timetable-updated"]')).toContainText('시간표가 업데이트되었습니다');
    });

    test('학부모 상담 예약 시스템', async ({ page, context }) => {
      await page.goto('/education/consultation');
      
      // Mock 학부모 상담 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetStudentParents') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                students: [
                  {
                    id: 's1',
                    name: '김동민',
                    class: '3-1',
                    parents: [
                      { name: '김○○', relationship: '아버지', phone: '010-****-1234' },
                      { name: '이○○', relationship: '어머니', phone: '010-****-5678' }
                    ],
                    concerns: ['학업성취도', '교우관계'],
                    lastConsultation: '2024-01-15'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 상담 대상 학생 선택
      await page.locator('[data-testid="student-search"]').fill('김동민');
      await page.locator('[data-testid="select-student-s1"]').click();
      
      const studentInfo = page.locator('[data-testid="student-info"]');
      await expect(studentInfo).toBeVisible();
      await expect(studentInfo).toContainText('김동민 (3-1)');
      await expect(studentInfo).toContainText('지난 상담: 2024-01-15');
      
      // 상담 유형 선택
      await page.selectOption('[data-testid="consultation-type"]', 'academic');
      
      // 상담 주제 자동 제안
      const suggestedTopics = page.locator('[data-testid="suggested-topics"]');
      await expect(suggestedTopics).toBeVisible();
      await expect(suggestedTopics).toContainText('학업성취도 향상 방안');
      await expect(suggestedTopics).toContainText('교우관계 개선');
      
      // 상담 가능 시간 확인
      await page.locator('[data-testid="check-availability"]').click();
      
      const availableSlots = page.locator('[data-testid="consultation-slots"]');
      await expect(availableSlots).toBeVisible();
      
      // 학부모별 가능 시간 표시
      await expect(availableSlots.locator('[data-testid="father-available"]')).toContainText('평일 저녁');
      await expect(availableSlots.locator('[data-testid="mother-available"]')).toContainText('주말 오전');
      
      // 공통 가능 시간 하이라이트
      await expect(availableSlots.locator('[data-testid="common-time"]')).toHaveClass(/highlighted/);
      
      // 상담 예약
      await availableSlots.locator('[data-testid="book-slot-sat-10am"]').click();
      
      // 상담 준비사항 자동 생성
      const consultationPrep = page.locator('[data-testid="consultation-prep"]');
      await expect(consultationPrep).toBeVisible();
      await expect(consultationPrep).toContainText('준비할 자료');
      await expect(consultationPrep).toContainText('성적표');
      await expect(consultationPrep).toContainText('생활기록부');
      
      // 알림 설정
      await page.check('[data-testid="remind-parents"]');
      await page.check('[data-testid="remind-teacher"]');
      
      // 예약 확정
      await page.locator('[data-testid="confirm-consultation"]').click();
      await expect(page.locator('[data-testid="consultation-booked"]')).toContainText('상담이 예약되었습니다');
    });

    test('온라인 수업 스케줄링 및 출석 관리', async ({ page, context }) => {
      await page.goto('/education/online-classes');
      
      // Mock 온라인 수업 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetOnlineClasses') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                onlineClasses: [
                  {
                    id: 'oc1',
                    subject: '수학',
                    teacher: '김선생님',
                    scheduledTime: '2024-02-01T09:00:00Z',
                    duration: 45,
                    platform: 'zoom',
                    students: 28,
                    status: 'scheduled'
                  }
                ],
                attendance: [
                  { studentId: 's1', name: '김동민', joinTime: '09:02', status: 'present' },
                  { studentId: 's2', name: '이수정', joinTime: null, status: 'absent' },
                  { studentId: 's3', name: '박민수', joinTime: '09:15', status: 'late' }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 온라인 수업 대시보드
      const onlineClassDashboard = page.locator('[data-testid="online-class-dashboard"]');
      await expect(onlineClassDashboard).toBeVisible();
      
      // 수업 시작 버튼
      const startClassButton = page.locator('[data-testid="start-class-oc1"]');
      await expect(startClassButton).toBeVisible();
      await startClassButton.click();
      
      // 수업 진행 인터페이스
      const classInterface = page.locator('[data-testid="class-interface"]');
      await expect(classInterface).toBeVisible();
      
      // 실시간 출석 현황
      const attendancePanel = classInterface.locator('[data-testid="attendance-panel"]');
      await expect(attendancePanel).toBeVisible();
      await expect(attendancePanel.locator('[data-testid="present-count"]')).toContainText('출석: 26명');
      await expect(attendancePanel.locator('[data-testid="absent-count"]')).toContainText('결석: 1명');
      await expect(attendancePanel.locator('[data-testid="late-count"]')).toContainText('지각: 1명');
      
      // 학생별 상세 출석 상황
      const attendanceList = attendancePanel.locator('[data-testid="attendance-list"]');
      await expect(attendanceList.locator('[data-testid="student-s1"]')).toHaveClass(/present/);
      await expect(attendanceList.locator('[data-testid="student-s2"]')).toHaveClass(/absent/);
      await expect(attendanceList.locator('[data-testid="student-s3"]')).toHaveClass(/late/);
      
      // 참여도 모니터링
      const participationMonitor = classInterface.locator('[data-testid="participation-monitor"]');
      await expect(participationMonitor).toBeVisible();
      await expect(participationMonitor).toContainText('활발한 참여: 15명');
      await expect(participationMonitor).toContainText('저조한 참여: 3명');
      
      // 개별 학생 관심 유도
      await participationMonitor.locator('[data-testid="engage-student-s2"]').click();
      await expect(page.locator('[data-testid="engagement-notification"]')).toContainText('이수정 학생에게 관심 유도 메시지 전송');
      
      // 수업 종료 및 출석 확정
      await classInterface.locator('[data-testid="end-class"]').click();
      
      const endClassConfirm = page.locator('[data-testid="end-class-confirm"]');
      await expect(endClassConfirm).toBeVisible();
      await expect(endClassConfirm).toContainText('출석부를 확정하시겠습니까?');
      
      await endClassConfirm.locator('[data-testid="finalize-attendance"]').click();
      await expect(page.locator('[data-testid="attendance-finalized"]')).toContainText('출석이 확정되었습니다');
    });
  });

  test.describe('법무 산업', () => {
    test('법정 일정 관리 및 변호사 스케줄링', async ({ page, context }) => {
      await page.goto('/settings/industry');
      await page.selectOption('[data-testid="industry-type"]', 'legal');
      
      await page.goto('/legal/court-schedule');
      
      // Mock 법정 일정 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetCourtSchedules') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                courtSchedules: [
                  {
                    id: 'cs1',
                    caseNumber: '2024고단123',
                    courtroom: '서울중앙지법 301호',
                    hearingType: '공판',
                    scheduledTime: '2024-02-15T10:00:00Z',
                    judge: '김○○ 판사',
                    prosecutor: '박○○ 검사',
                    clients: ['피고인 이○○'],
                    status: 'confirmed',
                    preparation: {
                      required: ['증거자료', '증인명단', '변론서면'],
                      deadline: '2024-02-13T18:00:00Z'
                    }
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 법정 일정 대시보드
      const courtDashboard = page.locator('[data-testid="court-dashboard"]');
      await expect(courtDashboard).toBeVisible();
      
      // 사건 정보 표시
      const caseInfo = courtDashboard.locator('[data-testid="case-cs1"]');
      await expect(caseInfo).toBeVisible();
      await expect(caseInfo).toContainText('2024고단123');
      await expect(caseInfo).toContainText('서울중앙지법 301호');
      await expect(caseInfo).toContainText('공판');
      
      // 준비사항 체크리스트
      const preparationChecklist = caseInfo.locator('[data-testid="preparation-checklist"]');
      await expect(preparationChecklist).toBeVisible();
      await expect(preparationChecklist.locator('[data-testid="evidence-docs"]')).toContainText('증거자료');
      await expect(preparationChecklist.locator('[data-testid="witness-list"]')).toContainText('증인명단');
      
      // 마감일 카운트다운
      const deadline = preparationChecklist.locator('[data-testid="deadline-countdown"]');
      await expect(deadline).toBeVisible();
      await expect(deadline).toContainText('마감까지');
      await expect(deadline).toHaveClass(/urgent/);
      
      // 새 법정 일정 추가
      await page.locator('[data-testid="add-court-schedule"]').click();
      
      const newCourtSchedule = page.locator('[data-testid="new-court-schedule"]');
      await expect(newCourtSchedule).toBeVisible();
      
      // 사건 기본 정보
      await page.fill('[data-testid="case-number"]', '2024고단456');
      await page.selectOption('[data-testid="case-type"]', 'civil');
      await page.selectOption('[data-testid="hearing-type"]', 'preliminary');
      
      // 법원 및 법정 선택
      await page.selectOption('[data-testid="court-name"]', 'seoul-central');
      
      // 가용한 법정 확인
      const availableCourtrooms = page.locator('[data-testid="available-courtrooms"]');
      await expect(availableCourtrooms).toBeVisible();
      await availableCourtrooms.locator('[data-testid="courtroom-201"]').click();
      
      // 관련 당사자 정보
      await page.fill('[data-testid="client-name"]', '원고 최○○');
      await page.fill('[data-testid="opposing-party"]', '피고 박○○');
      
      // 변호사 배정
      await page.selectOption('[data-testid="lead-attorney"]', 'lawyer-kim');
      await page.selectOption('[data-testid="co-counsel"]', 'lawyer-lee');
      
      // 준비 기간 자동 계산
      const prepTime = page.locator('[data-testid="preparation-time"]');
      await expect(prepTime).toBeVisible();
      await expect(prepTime).toContainText('권장 준비 기간: 14일');
      
      // 관련 법령 자동 태그
      const legalTags = page.locator('[data-testid="legal-tags"]');
      await expect(legalTags).toBeVisible();
      await expect(legalTags).toContainText('민사소송법');
      
      // 일정 생성
      await page.locator('[data-testid="create-court-schedule"]').click();
      await expect(page.locator('[data-testid="court-schedule-created"]')).toContainText('법정 일정이 등록되었습니다');
    });

    test('클라이언트 상담 예약 및 시간 추적', async ({ page, context }) => {
      await page.goto('/legal/client-consultation');
      
      // Mock 클라이언트 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetClients') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                clients: [
                  {
                    id: 'c1',
                    name: '김○○',
                    company: 'ABC기업',
                    caseType: '기업법무',
                    retainerStatus: 'active',
                    hourlyRate: 300000,
                    totalBilledHours: 45.5,
                    lastMeeting: '2024-01-20'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 클라이언트 목록
      const clientList = page.locator('[data-testid="client-list"]');
      await expect(clientList).toBeVisible();
      
      const clientCard = clientList.locator('[data-testid="client-c1"]');
      await expect(clientCard).toContainText('김○○ (ABC기업)');
      await expect(clientCard).toContainText('기업법무');
      await expect(clientCard).toContainText('누적 시간: 45.5시간');
      
      // 상담 예약
      await clientCard.locator('[data-testid="schedule-consultation"]').click();
      
      const consultationForm = page.locator('[data-testid="consultation-form"]');
      await expect(consultationForm).toBeVisible();
      
      // 상담 유형 선택
      await page.selectOption('[data-testid="consultation-type"]', 'contract-review');
      
      // 예상 소요 시간 자동 설정
      await expect(page.locator('[data-testid="estimated-duration"]')).toHaveValue('2'); // 2시간
      
      // 긴급도 설정
      await page.selectOption('[data-testid="urgency"]', 'high');
      
      // 관련 문서 업로드
      await page.setInputFiles('[data-testid="related-documents"]', {
        name: 'contract.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('contract-content')
      });
      
      // 기밀유지 확인
      const confidentialityAgreement = page.locator('[data-testid="confidentiality-agreement"]');
      await expect(confidentialityAgreement).toBeVisible();
      await confidentialityAgreement.locator('[data-testid="confirm-confidentiality"]').check();
      
      // 상담 예약 확정
      await page.locator('[data-testid="confirm-consultation"]').click();
      
      // 시간 추적 시작
      await expect(page.locator('[data-testid="time-tracking-started"]')).toContainText('시간 추적이 시작되었습니다');
      
      // 실시간 시간 추적
      const timeTracker = page.locator('[data-testid="time-tracker"]');
      await expect(timeTracker).toBeVisible();
      await expect(timeTracker.locator('[data-testid="current-session"]')).toContainText('진행 중');
      
      // 시간 중지 및 기록
      await page.locator('[data-testid="stop-time-tracking"]').click();
      
      const timeEntry = page.locator('[data-testid="time-entry"]');
      await expect(timeEntry).toBeVisible();
      await page.fill('[data-testid="time-description"]', '계약서 검토 및 법적 조언');
      await page.selectOption('[data-testid="billable-status"]', 'billable');
      
      await page.locator('[data-testid="save-time-entry"]').click();
      await expect(page.locator('[data-testid="time-entry-saved"]')).toContainText('시간이 기록되었습니다');
    });

    test('법률 연구 및 판례 검색 스케줄링', async ({ page, context }) => {
      await page.goto('/legal/research-schedule');
      
      // Mock 법률 연구 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetResearchTasks') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                researchTasks: [
                  {
                    id: 'rt1',
                    title: '부당해고 관련 판례 조사',
                    caseNumber: '2024고단123',
                    priority: 'high',
                    deadline: '2024-02-10T18:00:00Z',
                    estimatedHours: 8,
                    keywords: ['부당해고', '근로기준법', '대법원판례'],
                    status: 'in_progress'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 연구 작업 대시보드
      const researchDashboard = page.locator('[data-testid="research-dashboard"]');
      await expect(researchDashboard).toBeVisible();
      
      const researchTask = researchDashboard.locator('[data-testid="task-rt1"]');
      await expect(researchTask).toBeVisible();
      await expect(researchTask).toContainText('부당해고 관련 판례 조사');
      await expect(researchTask).toHaveClass(/high-priority/);
      
      // 새 연구 작업 생성
      await page.locator('[data-testid="create-research-task"]').click();
      
      const researchForm = page.locator('[data-testid="research-form"]');
      await expect(researchForm).toBeVisible();
      
      // 연구 주제 입력
      await page.fill('[data-testid="research-topic"]', '개인정보보호법 개정안 영향 분석');
      
      // 관련 키워드 자동 추천
      const suggestedKeywords = page.locator('[data-testid="suggested-keywords"]');
      await expect(suggestedKeywords).toBeVisible();
      await expect(suggestedKeywords).toContainText('개인정보보호법');
      await expect(suggestedKeywords).toContainText('GDPR');
      
      // 판례 검색 범위 설정
      await page.selectOption('[data-testid="court-level"]', 'supreme');
      await page.fill('[data-testid="date-range-from"]', '2020-01-01');
      await page.fill('[data-testid="date-range-to"]', '2024-01-31');
      
      // 예상 소요 시간 계산
      const estimatedTime = page.locator('[data-testid="estimated-research-time"]');
      await expect(estimatedTime).toBeVisible();
      await expect(estimatedTime).toContainText('예상 소요 시간: 12-16시간');
      
      // 연구 일정 자동 제안
      const suggestedSchedule = page.locator('[data-testid="suggested-schedule"]');
      await expect(suggestedSchedule).toBeVisible();
      await expect(suggestedSchedule).toContainText('4일간 분할 진행 권장');
      
      // 연구 협력자 배정
      await page.selectOption('[data-testid="research-collaborator"]', 'paralegal-kim');
      
      // 연구 작업 생성
      await page.locator('[data-testid="create-research"]').click();
      await expect(page.locator('[data-testid="research-task-created"]')).toContainText('연구 작업이 생성되었습니다');
    });
  });

  test.describe('제조업', () => {
    test('생산 라인 스케줄링 및 유지보수 관리', async ({ page, context }) => {
      await page.goto('/settings/industry');
      await page.selectOption('[data-testid="industry-type"]', 'manufacturing');
      
      await page.goto('/manufacturing/production-schedule');
      
      // Mock 생산 라인 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetProductionLines') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                productionLines: [
                  {
                    id: 'line1',
                    name: '조립라인 A',
                    product: 'Widget-100',
                    capacity: 1000,
                    currentStatus: 'running',
                    efficiency: 0.85,
                    nextMaintenance: '2024-02-15T02:00:00Z',
                    operators: ['김작업자', '이작업자'],
                    shifts: [
                      { name: '주간', start: '08:00', end: '16:00', supervisor: '박주임' },
                      { name: '야간', start: '16:00', end: '00:00', supervisor: '최주임' }
                    ]
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 생산 라인 대시보드
      const productionDashboard = page.locator('[data-testid="production-dashboard"]');
      await expect(productionDashboard).toBeVisible();
      
      const line1Status = productionDashboard.locator('[data-testid="line1-status"]');
      await expect(line1Status).toBeVisible();
      await expect(line1Status).toContainText('조립라인 A');
      await expect(line1Status).toContainText('Widget-100');
      await expect(line1Status).toHaveClass(/running/);
      
      // 효율성 지표
      const efficiency = line1Status.locator('[data-testid="efficiency-meter"]');
      await expect(efficiency).toContainText('85%');
      await expect(efficiency).toHaveClass(/good/);
      
      // 다음 유지보수 알림
      const maintenanceAlert = line1Status.locator('[data-testid="maintenance-alert"]');
      await expect(maintenanceAlert).toBeVisible();
      await expect(maintenanceAlert).toContainText('2일 후 유지보수 예정');
      
      // 생산 계획 수립
      await page.locator('[data-testid="create-production-plan"]').click();
      
      const productionPlan = page.locator('[data-testid="production-plan-form"]');
      await expect(productionPlan).toBeVisible();
      
      // 제품 및 수량 설정
      await page.selectOption('[data-testid="product-select"]', 'widget-200');
      await page.fill('[data-testid="target-quantity"]', '2000');
      
      // 마감일 설정
      await page.fill('[data-testid="target-date"]', '2024-02-20');
      
      // 자동 스케줄링
      await page.locator('[data-testid="auto-schedule"]').click();
      
      // 최적화 결과
      const scheduleResult = page.locator('[data-testid="schedule-result"]');
      await expect(scheduleResult).toBeVisible();
      await expect(scheduleResult).toContainText('3개 라인 14일 운영');
      await expect(scheduleResult).toContainText('예상 완료: 2024-02-18');
      
      // 병목 지점 표시
      const bottleneck = scheduleResult.locator('[data-testid="bottleneck-warning"]');
      await expect(bottleneck).toBeVisible();
      await expect(bottleneck).toContainText('포장 공정에서 지연 예상');
      
      // 리소스 부족 알림
      const resourceAlert = scheduleResult.locator('[data-testid="resource-alert"]');
      await expect(resourceAlert).toContainText('야간조 작업자 2명 추가 필요');
      
      // 계획 승인
      await page.locator('[data-testid="approve-plan"]').click();
      await expect(page.locator('[data-testid="plan-approved"]')).toContainText('생산 계획이 승인되었습니다');
    });

    test('설비 유지보수 스케줄링', async ({ page, context }) => {
      await page.goto('/manufacturing/maintenance');
      
      // Mock 설비 유지보수 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetEquipmentMaintenance') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                equipment: [
                  {
                    id: 'eq1',
                    name: '프레스 기계 #3',
                    type: 'press',
                    location: '조립라인 A',
                    lastMaintenance: '2024-01-15',
                    nextDue: '2024-02-15',
                    maintenanceType: 'preventive',
                    estimatedDowntime: 4,
                    priority: 'high',
                    condition: 'warning'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 설비 상태 모니터링
      const equipmentMonitor = page.locator('[data-testid="equipment-monitor"]');
      await expect(equipmentMonitor).toBeVisible();
      
      const equipment1 = equipmentMonitor.locator('[data-testid="equipment-eq1"]');
      await expect(equipment1).toBeVisible();
      await expect(equipment1).toContainText('프레스 기계 #3');
      await expect(equipment1).toHaveClass(/warning/);
      
      // 유지보수 일정 표시
      const maintenanceSchedule = equipment1.locator('[data-testid="maintenance-schedule"]');
      await expect(maintenanceSchedule).toContainText('다음 정비: 2024-02-15');
      await expect(maintenanceSchedule).toContainText('예상 중단: 4시간');
      
      // 긴급 유지보수 요청
      await equipment1.locator('[data-testid="request-urgent-maintenance"]').click();
      
      const urgentMaintenance = page.locator('[data-testid="urgent-maintenance-form"]');
      await expect(urgentMaintenance).toBeVisible();
      
      // 문제 상황 기술
      await page.fill('[data-testid="issue-description"]', '이상 소음 발생 및 진동 증가');
      await page.selectOption('[data-testid="urgency-level"]', 'critical');
      
      // 가용한 정비사 확인
      const availableTechnicians = page.locator('[data-testid="available-technicians"]');
      await expect(availableTechnicians).toBeVisible();
      await expect(availableTechnicians).toContainText('김정비사 (전문분야: 프레스)');
      
      // 예상 수리 시간
      await expect(page.locator('[data-testid="estimated-repair-time"]')).toContainText('2-6시간');
      
      // 대체 설비 제안
      const alternativeEquipment = page.locator('[data-testid="alternative-equipment"]');
      await expect(alternativeEquipment).toBeVisible();
      await expect(alternativeEquipment).toContainText('프레스 기계 #1 (가동 가능)');
      
      // 생산 영향 분석
      const productionImpact = page.locator('[data-testid="production-impact"]');
      await expect(productionImpact).toContainText('일일 생산량 30% 감소 예상');
      
      // 긴급 정비 요청 제출
      await page.locator('[data-testid="submit-urgent-request"]').click();
      await expect(page.locator('[data-testid="urgent-maintenance-requested"]')).toContainText('긴급 정비 요청이 접수되었습니다');
    });

    test('교대 근무 스케줄링 및 인력 관리', async ({ page, context }) => {
      await page.goto('/manufacturing/shift-management');
      
      // Mock 교대 근무 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetShiftSchedule') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                shifts: [
                  {
                    id: 'day-shift',
                    name: '주간조',
                    timeSlot: '08:00-16:00',
                    requiredWorkers: 15,
                    assignedWorkers: 14,
                    supervisor: '김주임',
                    skills: ['조립', '품질검사', '포장']
                  },
                  {
                    id: 'night-shift',
                    name: '야간조',
                    timeSlot: '16:00-00:00',
                    requiredWorkers: 12,
                    assignedWorkers: 10,
                    supervisor: '이주임',
                    skills: ['조립', '유지보수']
                  }
                ],
                workers: [
                  {
                    id: 'w1',
                    name: '김작업자',
                    skills: ['조립', '품질검사'],
                    shift: 'day-shift',
                    overtime: 5,
                    availability: 'available'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 교대 근무 대시보드
      const shiftDashboard = page.locator('[data-testid="shift-dashboard"]');
      await expect(shiftDashboard).toBeVisible();
      
      // 주간조 현황
      const dayShift = shiftDashboard.locator('[data-testid="day-shift-status"]');
      await expect(dayShift).toBeVisible();
      await expect(dayShift).toContainText('주간조 (08:00-16:00)');
      await expect(dayShift).toContainText('14/15명');
      await expect(dayShift).toHaveClass(/understaffed/);
      
      // 야간조 현황
      const nightShift = shiftDashboard.locator('[data-testid="night-shift-status"]');
      await expect(nightShift).toContainText('10/12명');
      await expect(nightShift).toHaveClass(/critically-understaffed/);
      
      // 인력 부족 알림
      const staffingAlert = page.locator('[data-testid="staffing-alert"]');
      await expect(staffingAlert).toBeVisible();
      await expect(staffingAlert).toContainText('야간조 2명 부족');
      
      // 자동 인력 재배치 제안
      const reallocationSuggestion = page.locator('[data-testid="reallocation-suggestion"]');
      await expect(reallocationSuggestion).toBeVisible();
      await expect(reallocationSuggestion).toContainText('잔업 가능한 주간조 직원 2명을 야간조로 배치');
      
      // 초과근무 관리
      await page.locator('[data-testid="manage-overtime"]').click();
      
      const overtimeManagement = page.locator('[data-testid="overtime-management"]');
      await expect(overtimeManagement).toBeVisible();
      
      // 직원별 초과근무 현황
      const overtimeList = overtimeManagement.locator('[data-testid="overtime-list"]');
      await expect(overtimeList.locator('[data-testid="worker-w1-overtime"]')).toContainText('김작업자: 5시간');
      
      // 초과근무 한도 경고
      const overtimeWarning = overtimeList.locator('[data-testid="overtime-warning"]');
      await expect(overtimeWarning).toContainText('주간 한도 초과 위험');
      
      // 신규 교대 계획 수립
      await page.locator('[data-testid="create-shift-plan"]').click();
      
      const shiftPlanForm = page.locator('[data-testid="shift-plan-form"]');
      await expect(shiftPlanForm).toBeVisible();
      
      // 생산 목표 기반 인력 계산
      await page.fill('[data-testid="production-target"]', '150');
      await page.selectOption('[data-testid="target-period"]', 'daily');
      
      // 자동 인력 계산
      await page.locator('[data-testid="calculate-staffing"]').click();
      
      const staffingResult = page.locator('[data-testid="staffing-result"]');
      await expect(staffingResult).toBeVisible();
      await expect(staffingResult).toContainText('권장 인력: 주간 16명, 야간 14명');
      
      // 스킬 매트릭스 확인
      const skillMatrix = page.locator('[data-testid="skill-matrix"]');
      await expect(skillMatrix).toBeVisible();
      await expect(skillMatrix).toContainText('품질검사 스킬 부족');
      
      // 교대 계획 승인
      await page.locator('[data-testid="approve-shift-plan"]').click();
      await expect(page.locator('[data-testid="shift-plan-approved"]')).toContainText('교대 계획이 승인되었습니다');
    });
  });
});