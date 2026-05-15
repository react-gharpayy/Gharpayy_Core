import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Redemption from '@/models/Redemption';
import GrowthProfile from '@/models/GrowthProfile';
import CoinLedger from '@/models/CoinLedger';
import { GrowthLogger } from '@/lib/growth/logger';
import mongoose from 'mongoose';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (process.env.ENABLE_GROWTH_ENGINE !== 'true') {
      return NextResponse.json({ error: 'Growth engine is disabled' }, { status: 403 });
    }

    const auth = await getAuthUser();
    if (!auth || (auth.role !== 'admin' && auth.role !== 'manager')) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { status, adminNotes } = await req.json();
    if (!['approved', 'rejected', 'fulfilled', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await connectDB();
    const redemption = await Redemption.findById(id);
    if (!redemption) return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });

    const oldStatus = redemption.status;
    redemption.status = status;
    if (adminNotes) redemption.notes += `\nAdmin Note: ${adminNotes}`;
    
    if (status === 'fulfilled' && !redemption.fulfilledAt) {
      redemption.fulfilledAt = new Date();
    }

    // Economy Protection: Refund coins if rejected
    if (status === 'rejected' && oldStatus === 'pending') {
      await GrowthProfile.findOneAndUpdate(
        { userId: redemption.userId },
        { $inc: { coins: redemption.coinCost } }
      );

      await CoinLedger.create({
        userId: redemption.userId,
        delta: redemption.coinCost,
        reason: `Refund: Rejected redemption for ${redemption.rewardTitle}`,
        relatedEventId: redemption._id,
        ts: new Date()
      });
    }

    await redemption.save();

    GrowthLogger.info('REDEMPTION_UPDATED', { 
      redemptionId: id, 
      adminId: auth.id, 
      newStatus: status 
    });

    return NextResponse.json({ ok: true, redemption });

  } catch (e: unknown) {
    console.error('API error in /api/growth/redemptions/[id]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
