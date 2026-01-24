import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../lib/api'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      if (token && userData) {
        setUser(JSON.parse(userData))
      }
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials)
      const { token, user } = response.data
      
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      setUser(user)
      
      toast.success('Login successful!')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' }
    }
  }

  const setUserFromStorage = () => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData)
      const { token, user } = response.data
      
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      setUser(user)
      
      toast.success('Registration successful!')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' }
    }
  }

  const logout = async () => {
    try {
      // Call server logout endpoint
      await authAPI.logout();
      
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if server logout fails, clear local storage
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      toast.success('Logged out successfully')
    }
  }

  const updateProfile = async (data) => {
    try {
      const response = await authAPI.updateProfile(data)
      const updatedUser = { ...user, ...data }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      toast.success('Profile updated successfully!')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Update failed' }
    }
  }

  const changePassword = async (data) => {
    try {
      await authAPI.changePassword(data)
      toast.success('Password changed successfully!')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Password change failed' }
    }
  }

  const value = {
    user,
    isLoading: loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    setUserFromStorage,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 