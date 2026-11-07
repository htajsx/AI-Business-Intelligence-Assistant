import { useState, useEffect } from 'react'
import { getSchema } from '../api/schemaApi'

export function useSchema() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSchema = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await getSchema()
      setData(res)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSchema()
  }, [])

  return { data, isLoading, error, refetch: fetchSchema }
}