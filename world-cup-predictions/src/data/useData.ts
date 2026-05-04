import { useContext } from 'react'
import { DataContext } from './DataContextObject'

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside DataProvider')
  return context
}
