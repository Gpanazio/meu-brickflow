import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { debugLog } from '../utils/debugLog'

export function useRealtimeProjects(isLoggedIn, updateProjects) {
  const supabaseRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!isLoggedIn) {
      // unsubscribe when user logs out
      channelRef.current?.unsubscribe()
      channelRef.current = null
      return
    }

    if (!supabaseRef.current) {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      supabaseRef.current = createClient(url, key)
    }

    const supabase = supabaseRef.current
    const channel = supabase
      .channel('public:brickflow_data')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'brickflow_data' },
        payload => {
          debugLog('📡 Realtime payload:', payload)
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newProjects = payload.new?.data
            if (newProjects) {
              updateProjects(() => newProjects)
            }
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [isLoggedIn, updateProjects])
}
