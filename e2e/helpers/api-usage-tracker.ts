import fs from 'fs/promises';
import path from 'path';

/**
 * 💰 API 사용량 추적 시스템
 * OpenAI, Google API 등의 사용량을 모니터링하고 일일 한도를 관리
 */

interface APIUsage {
  timestamp: Date;
  service: 'openai' | 'google' | 'anthropic';
  endpoint: string;
  tokens?: number;
  cost: number;
  model?: string;
}

interface DailyUsage {
  date: string;
  openai: number;
  google: number;
  anthropic: number;
  total: number;
  requests: APIUsage[];
}

class APIUsageTracker {
  private sessionUsage: APIUsage[] = [];
  private dailyLimit = 1000; // 일일 1000원 한도
  private usageFilePath = path.join(process.cwd(), 'e2e', 'api-usage.json');
  
  // API별 가격 정책 (원화 기준)
  private pricing = {
    openai: {
      'gpt-4': { input: 30, output: 60 }, // 1K 토큰당 원화
      'gpt-3.5-turbo': { input: 1.5, output: 2 },
      'dall-e-3': 40, // 이미지당
      'whisper': 0.6, // 분당
    },
    google: {
      'translate': 20, // 100만 문자당
      'vision': 1.5, // 이미지당
      'speech-to-text': 24, // 분당
    },
    anthropic: {
      'claude-3-opus': { input: 15, output: 75 },
      'claude-3-sonnet': { input: 3, output: 15 },
    }
  };
  
  /**
   * 세션 시작
   */
  async startSession(): Promise<void> {
    this.sessionUsage = [];
    await this.loadDailyUsage();
  }
  
  /**
   * API 호출 기록
   */
  async trackAPICall(usage: Omit<APIUsage, 'timestamp'>): Promise<void> {
    const record: APIUsage = {
      ...usage,
      timestamp: new Date()
    };
    
    this.sessionUsage.push(record);
    
    // 실시간 한도 체크
    const dailyTotal = await this.getDailyTotal();
    if (dailyTotal + usage.cost > this.dailyLimit) {
      throw new Error(`일일 API 사용 한도 초과! 현재: ₩${dailyTotal}, 한도: ₩${this.dailyLimit}`);
    }
  }
  
  /**
   * OpenAI API 사용량 계산
   */
  calculateOpenAICost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.pricing.openai[model as keyof typeof this.pricing.openai];
    
    if (typeof pricing === 'object') {
      return (inputTokens / 1000 * pricing.input) + (outputTokens / 1000 * pricing.output);
    }
    
    return 0;
  }
  
  /**
   * 이미지 생성 비용 계산
   */
  calculateImageGenerationCost(model: string = 'dall-e-3'): number {
    return this.pricing.openai[model as keyof typeof this.pricing.openai] as number || 40;
  }
  
  /**
   * Google Vision API 비용 계산
   */
  calculateVisionAPICost(imageCount: number): number {
    return imageCount * this.pricing.google.vision;
  }
  
  /**
   * 음성 인식 비용 계산
   */
  calculateSpeechCost(service: 'google' | 'openai', durationMinutes: number): number {
    if (service === 'google') {
      return durationMinutes * this.pricing.google['speech-to-text'];
    } else {
      return durationMinutes * this.pricing.openai.whisper;
    }
  }
  
  /**
   * 세션 종료 및 요약
   */
  async endSession(): Promise<{
    sessionCost: number;
    dailyTotal: number;
    totalCost: number;
    breakdown: Record<string, number>;
  }> {
    const sessionCost = this.sessionUsage.reduce((sum, usage) => sum + usage.cost, 0);
    const breakdown = this.getBreakdown(this.sessionUsage);
    
    // 일일 사용량 저장
    await this.saveDailyUsage();
    
    const dailyTotal = await this.getDailyTotal();
    
    return {
      sessionCost,
      dailyTotal,
      totalCost: dailyTotal,
      breakdown
    };
  }
  
  /**
   * 서비스별 사용량 분석
   */
  private getBreakdown(usages: APIUsage[]): Record<string, number> {
    const breakdown: Record<string, number> = {
      openai: 0,
      google: 0,
      anthropic: 0
    };
    
    usages.forEach(usage => {
      breakdown[usage.service] += usage.cost;
    });
    
    return breakdown;
  }
  
  /**
   * 일일 사용량 로드
   */
  private async loadDailyUsage(): Promise<DailyUsage> {
    try {
      const data = await fs.readFile(this.usageFilePath, 'utf-8');
      const allUsage = JSON.parse(data) as DailyUsage[];
      const today = new Date().toISOString().split('T')[0];
      
      return allUsage.find(u => u.date === today) || this.createEmptyDailyUsage();
    } catch {
      return this.createEmptyDailyUsage();
    }
  }
  
  /**
   * 일일 사용량 저장
   */
  private async saveDailyUsage(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let allUsage: DailyUsage[] = [];
    
    try {
      const data = await fs.readFile(this.usageFilePath, 'utf-8');
      allUsage = JSON.parse(data);
    } catch {
      // 파일이 없으면 새로 생성
    }
    
    const todayIndex = allUsage.findIndex(u => u.date === today);
    const todayUsage = this.createDailyUsageFromSession();
    
    if (todayIndex >= 0) {
      // 기존 데이터 업데이트
      allUsage[todayIndex].requests.push(...this.sessionUsage);
      allUsage[todayIndex].openai += todayUsage.openai;
      allUsage[todayIndex].google += todayUsage.google;
      allUsage[todayIndex].anthropic += todayUsage.anthropic;
      allUsage[todayIndex].total += todayUsage.total;
    } else {
      // 새로운 날짜 추가
      allUsage.push(todayUsage);
    }
    
    await fs.mkdir(path.dirname(this.usageFilePath), { recursive: true });
    await fs.writeFile(this.usageFilePath, JSON.stringify(allUsage, null, 2));
  }
  
  /**
   * 오늘 총 사용량
   */
  private async getDailyTotal(): Promise<number> {
    const daily = await this.loadDailyUsage();
    return daily.total;
  }
  
  /**
   * 빈 일일 사용량 생성
   */
  private createEmptyDailyUsage(): DailyUsage {
    return {
      date: new Date().toISOString().split('T')[0],
      openai: 0,
      google: 0,
      anthropic: 0,
      total: 0,
      requests: []
    };
  }
  
  /**
   * 세션에서 일일 사용량 생성
   */
  private createDailyUsageFromSession(): DailyUsage {
    const breakdown = this.getBreakdown(this.sessionUsage);
    const total = this.sessionUsage.reduce((sum, usage) => sum + usage.cost, 0);
    
    return {
      date: new Date().toISOString().split('T')[0],
      openai: breakdown.openai || 0,
      google: breakdown.google || 0,
      anthropic: breakdown.anthropic || 0,
      total,
      requests: this.sessionUsage
    };
  }
  
  /**
   * 사용량 리포트 생성
   */
  async generateReport(): Promise<string> {
    const daily = await this.loadDailyUsage();
    
    return `
📊 API 사용량 리포트 (${daily.date})
================================
💰 총 사용액: ₩${daily.total.toFixed(0)}
📈 한도 사용률: ${(daily.total / this.dailyLimit * 100).toFixed(1)}%

서비스별 사용량:
- OpenAI: ₩${daily.openai.toFixed(0)}
- Google: ₩${daily.google.toFixed(0)}
- Anthropic: ₩${daily.anthropic.toFixed(0)}

⚠️ 잔여 한도: ₩${(this.dailyLimit - daily.total).toFixed(0)}
================================
`;
  }
  
  /**
   * 실시간 모니터링용 웹소켓 데이터
   */
  async getRealtimeStats(): Promise<{
    current: number;
    limit: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    services: Record<string, number>;
  }> {
    const daily = await this.loadDailyUsage();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentUsage = daily.requests
      .filter(r => new Date(r.timestamp) > hourAgo)
      .reduce((sum, r) => sum + r.cost, 0);
    
    const previousHourUsage = daily.requests
      .filter(r => {
        const time = new Date(r.timestamp);
        return time < hourAgo && time > new Date(hourAgo.getTime() - 60 * 60 * 1000);
      })
      .reduce((sum, r) => sum + r.cost, 0);
    
    return {
      current: daily.total,
      limit: this.dailyLimit,
      percentage: daily.total / this.dailyLimit * 100,
      trend: recentUsage > previousHourUsage ? 'up' : 
             recentUsage < previousHourUsage ? 'down' : 'stable',
      services: {
        openai: daily.openai,
        google: daily.google,
        anthropic: daily.anthropic
      }
    };
  }
}

// 싱글톤 인스턴스
export const trackAPIUsage = new APIUsageTracker();

// 헬퍼 함수들
export async function mockAPICall(service: 'openai' | 'google', type: string): Promise<void> {
  const costs = {
    'chat-completion': 5,
    'image-generation': 40,
    'vision-api': 1.5,
    'speech-to-text': 2,
    'translation': 0.5
  };
  
  await trackAPIUsage.trackAPICall({
    service,
    endpoint: type,
    cost: costs[type as keyof typeof costs] || 1
  });
}

// 테스트용 모의 함수
export function simulateAPIUsage(minutesOfUsage: number = 10): APIUsage[] {
  const usage: APIUsage[] = [];
  const now = new Date();
  
  for (let i = 0; i < minutesOfUsage; i++) {
    // 랜덤하게 API 호출 시뮬레이션
    if (Math.random() > 0.5) {
      usage.push({
        timestamp: new Date(now.getTime() - i * 60 * 1000),
        service: 'openai',
        endpoint: 'chat.completions',
        tokens: Math.floor(Math.random() * 1000) + 100,
        cost: Math.random() * 10 + 1,
        model: 'gpt-3.5-turbo'
      });
    }
    
    if (Math.random() > 0.7) {
      usage.push({
        timestamp: new Date(now.getTime() - i * 60 * 1000),
        service: 'google',
        endpoint: 'vision.images.annotate',
        cost: 1.5
      });
    }
  }
  
  return usage;
}