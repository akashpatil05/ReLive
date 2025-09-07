import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/", // Django backend URL
});

// Example API calls
export const fetchUsers = () => API.get("users/");
export const registerUser = (userData) => API.post("auth/register/", userData);

export default API;
