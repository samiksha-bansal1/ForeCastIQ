// 52 weeks of demo sales data with trend + seasonality + anomalies
export interface DataPoint {
  date: string;
  value: number;
  forecast?: number;
  forecastLow?: number;
  forecastHigh?: number;
  baseline?: number;
  rollingMean?: number;
  upperBand?: number;
  lowerBand?: number;
  isAnomaly?: boolean;
  anomalySeverity?: 'HIGH' | 'MEDIUM' | null;
  deviation?: number;
}

export interface AnomalyData {
  date: string;
  value: number;
  deviation: number;
  severity: 'HIGH' | 'MEDIUM';
  cause: string;
  action: string;
}

// Generate 52 weeks of historical data starting from 2023-01-01
function generateDemoData(): DataPoint[] {
  const data: DataPoint[] = [];
  const startDate = new Date('2023-01-01');
  
  for (let week = 0; week < 52; week++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + week * 7);
    
    // Base trend: slight upward trend
    const trend = 3500 + week * 25;
    
    // Weekly seasonality (higher mid-week)
    const seasonality = Math.sin(week * 0.5) * 300;
    
    // Random noise
    const noise = (Math.random() - 0.5) * 400;
    
    // Add anomaly spikes at specific weeks
    let anomalySpike = 0;
    let isAnomaly = false;
    let anomalySeverity: 'HIGH' | 'MEDIUM' | null = null;
    
    if (week === 12) {
      anomalySpike = 1800; // HIGH anomaly
      isAnomaly = true;
      anomalySeverity = 'HIGH';
    } else if (week === 28) {
      anomalySpike = 1100; // MEDIUM anomaly
      isAnomaly = true;
      anomalySeverity = 'MEDIUM';
    } else if (week === 42) {
      anomalySpike = -1200; // MEDIUM anomaly (drop)
      isAnomaly = true;
      anomalySeverity = 'MEDIUM';
    }
    
    const value = Math.round(trend + seasonality + noise + anomalySpike);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(value, 1000),
      isAnomaly,
      anomalySeverity,
    });
  }
  
  return data;
}

// Calculate rolling statistics for anomaly detection
function calculateRollingStats(data: DataPoint[], window: number = 8): DataPoint[] {
  return data.map((point, index) => {
    const start = Math.max(0, index - window);
    const windowData = data.slice(start, index + 1);
    
    const mean = windowData.reduce((sum, p) => sum + p.value, 0) / windowData.length;
    const variance = windowData.reduce((sum, p) => sum + Math.pow(p.value - mean, 2), 0) / windowData.length;
    const stdDev = Math.sqrt(variance);
    
    const deviation = stdDev > 0 ? (point.value - mean) / stdDev : 0;
    
    return {
      ...point,
      rollingMean: Math.round(mean),
      upperBand: Math.round(mean + 2 * stdDev),
      lowerBand: Math.round(mean - 2 * stdDev),
      deviation: Math.round(deviation * 10) / 10,
    };
  });
}

// Generate forecast data (next 4 weeks)
function generateForecast(historicalData: DataPoint[]): DataPoint[] {
  const lastValue = historicalData[historicalData.length - 1].value;
  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  
  // Calculate baseline from last 8 weeks
  const recentData = historicalData.slice(-8);
  const baseline = recentData.reduce((sum, p) => sum + p.value, 0) / recentData.length;
  
  const forecast: DataPoint[] = [];
  
  for (let week = 1; week <= 4; week++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + week * 7);
    
    // Forecast with slight growth + seasonality
    const growth = 1.015 + (week * 0.005);
    const seasonality = Math.sin(week * 0.8) * 200;
    const forecastValue = Math.round(lastValue * growth + seasonality);
    
    // Confidence bands widen over time
    const uncertainty = 200 + week * 160;
    
    forecast.push({
      date: date.toISOString().split('T')[0],
      value: forecastValue,
      forecast: forecastValue,
      forecastLow: forecastValue - uncertainty,
      forecastHigh: forecastValue + uncertainty,
      baseline: Math.round(baseline),
    });
  }
  
  return forecast;
}

// Get anomaly details for display
function getAnomalies(data: DataPoint[]): AnomalyData[] {
  const dataWithStats = calculateRollingStats(data);
  
  return dataWithStats
    .filter(p => p.isAnomaly)
    .map(p => ({
      date: p.date,
      value: p.value,
      deviation: p.deviation || 0,
      severity: p.anomalySeverity as 'HIGH' | 'MEDIUM',
      cause: p.anomalySeverity === 'HIGH' 
        ? 'Viral social media campaign drove unexpected traffic spike. Product featured on major influencer account with 2M+ followers.'
        : p.deviation && p.deviation > 0
        ? 'Regional promotion in Northeast markets coincided with competitor stockout. Demand shifted to our products temporarily.'
        : 'Supply chain disruption caused inventory shortage. Fulfillment delays led to cancelled orders and reduced sales.',
      action: p.anomalySeverity === 'HIGH'
        ? 'Review inventory levels for similar future events. Consider building safety stock for viral-prone SKUs.'
        : p.deviation && p.deviation > 0
        ? 'Monitor competitor inventory levels. Prepare rapid-response inventory allocation for future opportunities.'
        : 'Diversify supplier base to reduce single-point-of-failure risk. Implement early warning system for supply disruptions.',
    }));
}

// Export all demo data
export const demoData = generateDemoData();
export const demoDataWithStats = calculateRollingStats(demoData);
export const demoForecast = generateForecast(demoData);
export const demoAnomalies = getAnomalies(demoData);

// Combined historical + forecast for chart display
export const demoChartData = [
  ...demoDataWithStats.slice(-12).map(p => ({
    ...p,
    type: 'historical' as const,
  })),
  ...demoForecast.map(p => ({
    ...p,
    type: 'forecast' as const,
  })),
];

// Stats calculations
export const demoStats = {
  forecast: {
    trend: '+6.2%',
    trendDirection: 'up' as const,
    confidenceRange: '±840 units',
    peakWeek: 'Week 3',
    vsBaseline: '+4.1%',
  },
  anomaly: {
    total: 3,
    high: 1,
    medium: 2,
  },
};

// Scenario comparison data
export function generateScenarioData(scenarioType: string): { baseline: number; scenario: number }[] {
  const baselineValues = [4200, 4350, 4520, 4480];
  const multiplier = scenarioType.includes('20%') ? 1.2 : 
                     scenarioType.includes('15%') ? 0.85 : 1.1;
  
  return baselineValues.map((baseline, i) => ({
    week: `Week ${i + 1}`,
    baseline,
    scenario: Math.round(baseline * multiplier),
  }));
}
