import mongoose from 'mongoose';

export async function healthCheck(): Promise<{ status: string; checks: Record<string, { status: string; detail?: string }>; timestamp: string; uptime: number }> {
  const checks: Record<string, { status: string; detail?: string }> = {};

  try {
    const dbState = mongoose.connection.readyState;
    checks.database = { status: dbState === 1 ? 'healthy' : 'unhealthy', detail: 'MongoDB' };
  } catch (error) {
    checks.database = { status: 'unhealthy', detail: (error as Error).message };
  }

  checks.llm = { status: process.env.OPENROUTER_API_KEY ? 'healthy' : 'unhealthy', detail: 'OpenRouter' };

  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
