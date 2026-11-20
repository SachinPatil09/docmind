import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserDto } from '../types';
import { authApi } from '../services/authApi';
import { conversationApi } from '../services/conversationApi';

interface AuthState {
  user: UserDto | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<UserDto>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login(username, password);
          set({
            token: res.accessToken,
            user: res.user,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          const user = await authApi.register(username, email, password);
          set({ isLoading: false });
          return user;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        const currentUser = get().user;
        if (currentUser?.id) {
          conversationApi.clearAllUserData(currentUser.id);
        }
        set({ user: null, token: null, isLoading: false });
      },
    }),
    {
      name: 'docmind-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
