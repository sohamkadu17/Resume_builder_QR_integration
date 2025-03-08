// API URL
const API_URL = 'http://localhost:3000/api';

// Get token
const token = localStorage.getItem('token');

// Headers
const headers = {
  'Content-Type': 'application/json',
  'x-auth-token': token
};

// Save Resume
async function saveResume(resumeData) {
  try {
    const response = await fetch(`${API_URL}/resumes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(resumeData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to save resume');
    }

    return data;
  } catch (error) {
    alert(error.message);
  }
}

// Update Resume
async function updateResume(id, resumeData) {
  try {
    const response = await fetch(`${API_URL}/resumes/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(resumeData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update resume');
    }

    return data;
  } catch (error) {
    alert(error.message);
  }
}

// Get All Resumes
async function getResumes() {
  try {
    const response = await fetch(`${API_URL}/resumes`, {
      headers
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch resumes');
    }

    return data;
  } catch (error) {
    alert(error.message);
  }
}

// Delete Resume
async function deleteResume(id) {
  try {
    const response = await fetch(`${API_URL}/resumes/${id}`, {
      method: 'DELETE',
      headers
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete resume');
    }

    return data;
  } catch (error) {
    alert(error.message);
  }
}