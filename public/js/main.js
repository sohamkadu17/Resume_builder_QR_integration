document.addEventListener('DOMContentLoaded', () => {
  // Check authentication on protected pages
  const protectedPages = ['/dashboard.html', '/resume-builder.html'];
  if (protectedPages.some(page => window.location.pathname.includes(page))) {
    checkAuth();
  }

  // Login Form Handler
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      await handleLogin(email, password);
    });
  }

  // Register Form Handler
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const fullName = document.getElementById('signupName').value;
      await handleRegister(email, password, fullName);
    });
  }

  // Resume Form Handler
  const resumeForm = document.getElementById('personal-info-form');
  if (resumeForm) {
    resumeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(resumeForm);
      const resumeData = {
        template_id: localStorage.getItem('selectedTemplate') || '1',
        personal_info: {
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          address: formData.get('address'),
          summary: formData.get('summary')
        }
      };

      try {
        const response = await fetch('/api/resumes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token')
          },
          body: JSON.stringify(resumeData)
        });

        if (!response.ok) {
          throw new Error('Failed to save personal information');
        }

        const data = await response.json();
        localStorage.setItem('currentResumeId', data.id);
        window.location.href = '/experience';
      } catch (error) {
        console.error('Error:', error);
        alert(error.message);
      }
    });
  }

  // Experience Form Handler
  const experienceForm = document.querySelector('.experience-form');
  if (experienceForm) {
    experienceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        const experiences = [];
        document.querySelectorAll('.experience-card').forEach(card => {
          const experience = {
            companyName: card.querySelector('[name="companyName"]').value,
            jobTitle: card.querySelector('[name="jobTitle"]').value,
            startDate: card.querySelector('[name="startDate"]').value,
            endDate: card.querySelector('[name="endDate"]').value,
            location: card.querySelector('[name="location"]').value,
            responsibilities: Array.from(card.querySelectorAll('.responsibility-input'))
              .map(input => input.value)
              .filter(value => value.trim() !== '')
          };
          experiences.push(experience);
        });

        const resumeId = localStorage.getItem('currentResumeId');
        if (!resumeId) {
          throw new Error('No resume ID found');
        }

        const response = await fetch(`/api/resumes/${resumeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token')
          },
          body: JSON.stringify({ experience: experiences })
        });

        if (!response.ok) {
          throw new Error('Failed to save work experience');
        }

        await response.json();
        window.location.href = '/education';
      } catch (error) {
        console.error('Error:', error);
        alert(error.message);
      }
    });
  }

  // Education Form Handler
  const educationForm = document.querySelector('.education-form');
  if (educationForm) {
    educationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        const education = [];
        document.querySelectorAll('.education-card').forEach(card => {
          const edu = {
            school: card.querySelector('[name="school"]').value,
            degree: card.querySelector('[name="degree"]').value,
            fieldOfStudy: card.querySelector('[name="fieldOfStudy"]').value,
            gpa: card.querySelector('[name="gpa"]').value,
            startDate: card.querySelector('[name="startDate"]').value,
            endDate: card.querySelector('[name="endDate"]').value,
            location: card.querySelector('[name="location"]').value,
            achievements: Array.from(card.querySelectorAll('.achievement-input'))
              .map(input => input.value)
              .filter(value => value.trim() !== '')
          };
          education.push(edu);
        });

        const resumeId = localStorage.getItem('currentResumeId');
        if (!resumeId) {
          throw new Error('No resume ID found');
        }

        const response = await fetch(`/api/resumes/${resumeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token')
          },
          body: JSON.stringify({ education })
        });

        if (!response.ok) {
          throw new Error('Failed to save education information');
        }

        await response.json();
        window.location.href = '/review';
      } catch (error) {
        console.error('Error:', error);
        alert(error.message);
      }
    });
  }

  // Logout Handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('currentResumeId');
      localStorage.removeItem('selectedTemplate');
      window.location.href = '/';
    });
  }
});