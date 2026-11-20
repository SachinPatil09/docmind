import axios from 'axios';
import { LoginResponse, UserDto } from '../types';

const API_BASE = '/api/v1';

export const authApi = {
  // Login by username + password -> returns raw LoginResponse ({ accessToken, user })
  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await axios.post<LoginResponse>(`${API_BASE}/auth/login`, {
      username,
      password,
    });
    return res.data;
  },

  // Register -> returns raw UserDto ({ id, username, email, role })
  async register(username: string, email: string, password: string): Promise<UserDto> {
    const res = await axios.post<UserDto>(`${API_BASE}/auth/register`, {
      username,
      email,
      password,
    });
    return res.data;
  },
};
