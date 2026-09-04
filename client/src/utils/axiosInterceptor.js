import axios from "axios";
import { useNavigate } from "react-router-dom";

// Create a custom axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_Base_API,
  withCredentials: true,
});

// Function to attach interceptors
export const setupInterceptors = (navigate) => {
  // Response interceptor
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.warn("⚠️ Session expired or unauthorized. Redirecting to login...");
        alert("Your session has expired. Please log in again to continue.");
        navigate("/login");
      }
      return Promise.reject(error);
    }
  );
};

export default api;