import api from "./api";

const requestService = {
  createRequest(data) {
    const token = localStorage.getItem("token");

    return api.post("/requests", data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  getAll() {
    return api.get("/requests");
  },
};

export default requestService;
