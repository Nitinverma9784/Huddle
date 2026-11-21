import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { room_code, player_id, player_name, action } = await req.json()
    if (!room_code || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, settings, current_question_index')
      .eq('room_code', room_code.toUpperCase().trim())
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const currentSettings = (session.settings as Record<string, any>) || {}
    const integrityAlerts: Array<{
      id: string
      playerId: string
      playerName: string
      action: string
      timestamp: string
      timestampMs: number
      questionIndex: number
    }> = Array.isArray(currentSettings.integrity_alerts) ? currentSettings.integrity_alerts : []

    const tabSwitches: Record<string, number> =
      typeof currentSettings.tab_switches === 'object' && currentSettings.tab_switches
        ? { ...currentSettings.tab_switches }
        : {}

    const isTabSwitch =
      action.toLowerCase().includes('tab') ||
      action.toLowerCase().includes('blur') ||
      action.toLowerCase().includes('window') ||
      action.toLowerCase().includes('minimized')

    if (player_id && isTabSwitch) {
      tabSwitches[player_id] = (tabSwitches[player_id] || 0) + 1
    }

    const newAlert = {
      id: crypto.randomUUID(),
      playerId: player_id || 'unknown',
      playerName: player_name || 'Player',
      action,
      timestamp: new Date().toLocaleTimeString(),
      timestampMs: Date.now(),
      questionIndex: session.current_question_index ?? 0,
    }

    // Keep the most recent 200 events to prevent JSON payload ballooning
    const updatedAlerts = [newAlert, ...integrityAlerts].slice(0, 200)

    await supabase
      .from('sessions')
      .update({
        settings: {
          ...currentSettings,
          integrity_alerts: updatedAlerts,
          tab_switches: tabSwitches,
        },
      })
      .eq('id', session.id)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record activity'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
