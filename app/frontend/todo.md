EduLink EC - AI-Powered Student Learning Platform
Design Guidelines
Design References
Coursera.org: Clean educational layout, card-based course browsing
Khan Academy: Friendly, accessible learning interface
Style: Modern Educational + Gradient Accents + Clean Cards
Color Palette
Primary: #1E3A5F (Deep Navy - trust/education)
Secondary: #0EA5E9 (Sky Blue - energy/tech)
Accent: #F59E0B (Amber - highlights/CTAs)
Success: #10B981 (Emerald - progress)
Background: #F8FAFC (Light Gray)
Card: #FFFFFF (White)
Text Primary: #1E293B (Dark Slate)
Text Secondary: #64748B (Slate)
Typography
Font: Inter (clean, modern, highly readable)
Heading1: Inter 700 (36px)
Heading2: Inter 600 (28px)
Heading3: Inter 600 (20px)
Body: Inter 400 (16px)
Key Component Styles
Cards: White bg, subtle shadow, 12px rounded, hover lift effect
Buttons: Primary gradient (navy to blue), white text, 8px rounded
Navigation: Sticky top, white bg with shadow on scroll
Sidebar: Dark navy bg for dashboard
Images to Generate
hero-students-learning.jpg - Diverse group of students studying together in a modern university library, warm lighting (photorealistic)
ai-assistant-concept.jpg - Futuristic AI hologram helping a student with books and digital screens, blue tones (photorealistic)
subjects-grid-bg.jpg - Abstract geometric pattern with educational icons, blue and amber gradient (minimalist)
career-opportunity.jpg - Young professional in a modern office environment, confident pose, bright lighting (photorealistic)
Database Tables
study_schedules (user-specific, create_only=true) - user_id, title, subject, day_of_week, start_time, end_time, color, is_active
bookmarks (user-specific, create_only=true) - user_id, resource_type, resource_id, resource_title, created_at
subjects (public, create_only=false) - id, name, category, description, icon, course_count
books (public, create_only=false) - id, title, author, subject, description, cover_url, download_url, pages, year
internships (public, create_only=false) - id, title, company, location, description, type, deadline, url, is_active
scholarships (public, create_only=false) - id, title, provider, amount, deadline, eligibility, description, url, is_active
question_papers (public, create_only=false) - id, title, subject, year, semester, university, download_url
Development Tasks & Files (max 8 code files)
Files to Create/Modify:
src/pages/Index.tsx - Landing page with hero, features, subjects preview, CTA
src/pages/Dashboard.tsx - Student dashboard with sidebar nav, stats, quick actions
src/pages/AIAssistant.tsx - AI chat interface for concept explanations
src/pages/SubjectExplorer.tsx - Browse subjects/courses with search & filter
src/pages/Library.tsx - Digital library with books, search, download
src/pages/Opportunities.tsx - Internships, jobs, scholarships combined page
src/components/Header.tsx - Responsive navbar with auth
src/App.tsx - Updated routes
Features per page:
Landing: Hero section, feature cards, subject categories, testimonials, CTA
Dashboard: Study timetable builder, bookmarks, recent AI chats, notifications, quick links
AI Assistant: Chat UI, subject selector, streaming responses, conversation history
Subject Explorer: Grid of subjects, topic drill-down, AI explain button
Library: Book cards, search, filter by subject, download links
Opportunities: Tabs for internships/jobs/scholarships, filters, application links