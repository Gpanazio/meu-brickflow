import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { debugLog } from '../utils/debugLog'

export function useRealtimeProjects(isLoggedIn, updateProjects) {
  const channelRef = useRef(null)

  useEffect(() => {
    if (!isLoggedIn) {
      // unsubscribe when user logs out
      channelRef.current?.unsubscribe()
      channelRef.current = null
      return
    }

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
