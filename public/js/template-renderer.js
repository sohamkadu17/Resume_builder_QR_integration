// Fetch and render resume data
async function renderResume() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const resumeId = urlParams.get('id');
        
        if (!resumeId) {
            throw new Error('Resume ID not provided');
        }

        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        const response = await fetch(`/api/resumes/${resumeId}`, {
            headers: {
                'x-auth-token': token
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch resume data');
        }

        const resume = await response.json();
        
        // Render personal information
        const personalInfo = resume.personal_info;
        document.getElementById('fullName').textContent = `${personalInfo.firstName} ${personalInfo.lastName}`;
        document.getElementById('email').textContent = personalInfo.email;
        document.getElementById('phone').textContent = personalInfo.phone;
        document.getElementById('address').textContent = personalInfo.address;
        document.getElementById('summary').textContent = personalInfo.summary;

        // Render experience
        const experienceContainer = document.getElementById('experienceContainer');
        resume.experience.forEach(exp => {
            const expElement = document.createElement('div');
            expElement.className = 'experience-item';
            expElement.innerHTML = `
                <div class="company-name">${exp.companyName}</div>
                <div class="job-title">${exp.jobTitle}</div>
                <div class="date-location">${exp.startDate} - ${exp.endDate} | ${exp.location}</div>
                <ul>
                    ${exp.responsibilities.map(resp => `<li>${resp}</li>`).join('')}
                </ul>
            `;
            experienceContainer.appendChild(expElement);
        });

        // Render education
        const educationContainer = document.getElementById('educationContainer');
        resume.education.forEach(edu => {
            const eduElement = document.createElement('div');
            eduElement.className = 'education-item';
            eduElement.innerHTML = `
                <div class="school-name">${edu.school}</div>
                <div class="degree">${edu.degree} in ${edu.fieldOfStudy}</div>
                <div class="date-location">${edu.startDate} - ${edu.endDate} | ${edu.location}</div>
                <div>GPA: ${edu.gpa}</div>
                <ul>
                    ${edu.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
                </ul>
            `;
            educationContainer.appendChild(eduElement);
        });

    } catch (error) {
        console.error('Error rendering resume:', error);
        alert('Failed to load resume data');
    }
}

// Initialize rendering when the page loads
document.addEventListener('DOMContentLoaded', renderResume);