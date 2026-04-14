import { NextRequest, NextResponse } from 'next/server';

const defaultConfig = {
  g1Label: 'G1',
  g2Label: 'G2',
  g3Label: 'G3',
  g4Label: 'G4',
  glToursLabel: 'GL Tours',
};

export async function GET() {
  return NextResponse.json({ ok: true, config: defaultConfig });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const config = {
      g1Label: typeof body.g1Label === 'string' ? body.g1Label.trim() : defaultConfig.g1Label,
      g2Label: typeof body.g2Label === 'string' ? body.g2Label.trim() : defaultConfig.g2Label,
      g3Label: typeof body.g3Label === 'string' ? body.g3Label.trim() : defaultConfig.g3Label,
      g4Label: typeof body.g4Label === 'string' ? body.g4Label.trim() : defaultConfig.g4Label,
      glToursLabel: typeof body.glToursLabel === 'string' ? body.glToursLabel.trim() : defaultConfig.glToursLabel,
    };
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
