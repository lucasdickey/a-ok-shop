import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Test endpoint is working!',
    timestamp: new Date().toISOString()
  });
}
