import { Link } from "react-router-dom";
import { useState } from "react";

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showQuickLinksModal, setShowQuickLinksModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(to bottom, #800000 30%, #D3D3D3 50%, #ffffff 100%)' }}>
      
      {/* Navigation Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <img src="/wmsu-logo.jpg" alt="WMSU Logo" className="w-12 h-12 rounded-full" />
              <div>
                <h1 className="text-2xl font-bold text-red-800">WMSU ILS</h1>
                <p className="text-sm text-gray-600">Integrated Learning System - Elementary Department</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center">
              <div className="text-white font-medium">
                WMSU Integrated Learning System
              </div>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-red-800 hover:bg-red-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col space-y-3">
                <Link 
                  to="/login" 
                  className="text-red-800 hover:text-red-600 font-medium text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login to System
                </Link>
                <a
                  href="https://expo.dev/artifacts/eas/rzs8tmmhq9K3UgHjyV731x.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-red-800 hover:text-red-600 font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Download Mobile App
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
                Welcome to
                <span className="block text-yellow-300 mt-2">WMSU ILS</span>
              </h1>
              <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-4">
                Integrated Learning System - Elementary Department
              </h2>
              <p className="text-lg text-white/90 mb-8 leading-relaxed">
                A comprehensive educational management system designed for Western Mindanao State University. 
                Streamline academic operations, enhance student learning, and empower educators with our 
                all-in-one digital platform.
              </p>
              
              {/* Feature Highlights */}
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-800" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold">Student Management</h3>
                  </div>
                  <p className="text-white/80 text-sm">Comprehensive student records and academic tracking</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-800" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold">Digital Learning</h3>
                  </div>
                  <p className="text-white/80 text-sm">Interactive learning materials and resources</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-800" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                        <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold">Grade Management</h3>
                  </div>
                  <p className="text-white/80 text-sm">Automated grading and assessment tools</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-800" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold">Teacher Portal</h3>
                  </div>
                  <p className="text-white/80 text-sm">Comprehensive tools for educators and staff</p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to="/login" 
                  className="bg-white text-red-800 px-8 py-3 rounded-lg hover:bg-gray-100 transition duration-300 font-bold text-lg shadow-lg"
                >
                  Get Started
                </Link>
                <a
                  href="https://expo.dev/artifacts/eas/rzs8tmmhq9K3UgHjyV731x.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-yellow-400 text-red-800 px-8 py-3 rounded-lg hover:bg-yellow-300 transition duration-300 font-bold text-lg shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Download Mobile App
                </a>
              </div>
            </div>

            {/* Right Content - App Preview */}
            <div className="relative">
              <div className="relative z-10">
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    
                    {/* Mock Dashboard Preview */}
                    <div className="space-y-4">
                      <div className="bg-gray-100 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-red-800 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">Student Dashboard</h4>
                            <p className="text-sm text-gray-600">View grades and attendance</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-red-50 rounded p-2 text-center">
                            <div className="text-lg font-bold text-red-800">95%</div>
                            <div className="text-xs text-gray-600">Attendance</div>
                          </div>
                          <div className="bg-blue-50 rounded p-2 text-center">
                            <div className="text-lg font-bold text-blue-800">88</div>
                            <div className="text-xs text-gray-600">Average</div>
                          </div>
                          <div className="bg-green-50 rounded p-2 text-center">
                            <div className="text-lg font-bold text-green-800">12</div>
                            <div className="text-xs text-gray-600">Subjects</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-100 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">Digital Library</h4>
                            <p className="text-sm text-gray-600">Access learning resources</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="bg-white rounded p-2 flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="text-sm text-gray-700">Mathematics Module 1</div>
                          </div>
                          <div className="bg-white rounded p-2 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div className="text-sm text-gray-700">Science Lab Manual</div>
                          </div>
                          <div className="bg-white rounded p-2 flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <div className="text-sm text-gray-700">English Literature</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute top-0 -left-4 w-20 h-20 bg-yellow-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute bottom-0 -right-4 w-32 h-32 bg-white rounded-full opacity-10 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="bg-white/10 backdrop-blur-sm py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-black/70 mb-4">
                Why Choose WMSU ILS?
              </h2>
              <p className="text-lg text-black/60 max-w-2xl mx-auto">
                Our comprehensive platform is designed to meet the unique needs of educational institutions 
                in the digital age.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-800" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Secure & Reliable</h3>
                <p className="text-gray-600">Enterprise-grade security with data encryption and regular backups to ensure your information is always protected.</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-800" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 7H7v6h6V7z"/>
                    <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Easy to Use</h3>
                <p className="text-gray-600">Intuitive interface designed for educators, students, and administrators with minimal training required.</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-800" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Scalable Solution</h3>
                <p className="text-gray-600">Grows with your institution from small classrooms to entire university systems.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-red-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/wmsu-logo.jpg" alt="WMSU Logo" className="w-10 h-10 rounded-full" />
                <div>
                  <h3 className="font-bold text-lg">WMSU ILS</h3>
                  <p className="text-sm text-red-200">Integrated Learning System - Elementary Department</p>
                </div>
              </div>
              <p className="text-red-200 text-sm">
                Empowering education through innovative technology solutions for Western Mindanao State University.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-4">Quick Links</h4>
              <ul className="space-y-2 text-red-200">
                <li><button onClick={() => setShowQuickLinksModal('userGuide')} className="hover:text-white transition text-left">User Guide</button></li>
                <li><button onClick={() => setShowQuickLinksModal('support')} className="hover:text-white transition text-left">Support</button></li>
                <li><button onClick={() => setShowQuickLinksModal('privacy')} className="hover:text-white transition text-left">Privacy Policy</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-4">Get Started</h4>
              <p className="text-red-200 text-sm mb-4">
                Ready to transform your educational experience?
              </p>
              <div className="flex flex-col gap-2">
                <Link 
                  to="/login" 
                  className="bg-white text-red-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition font-medium text-center"
                >
                  Login to System
                </Link>
                <a
                  href="https://expo.dev/artifacts/eas/rzs8tmmhq9K3UgHjyV731x.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-yellow-400 text-red-800 px-4 py-2 rounded-lg hover:bg-yellow-300 transition font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Download Mobile App
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-red-800 mt-8 pt-6 text-center text-red-200 text-sm">
            <p>&copy; 2026 Western Mindanao State University - Integrated Learning System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    {/* Quick Links Modal */}
      {showQuickLinksModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto hide-scrollbar">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-red-800">
                  {showQuickLinksModal === 'userGuide' && 'User Guide'}
                  {showQuickLinksModal === 'support' && 'Support'}
                  {showQuickLinksModal === 'privacy' && 'Privacy Policy'}
                </h2>
                <button
                  onClick={() => setShowQuickLinksModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {showQuickLinksModal === 'userGuide' && (
                <div className="space-y-4 text-gray-700">
                  <h3 className="text-lg font-semibold mb-3">Getting Started with WMSU ILS</h3>
                  
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Mobile App Setup</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Download the mobile app from the download button</li>
                      <li>Install the APK on your Android device</li>
                      <li>Open the app and log in with your credentials</li>
                      <li>Navigate through the dashboard to access features</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Web Portal Access</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Visit the WMSU ILS website</li>
                      <li>Click "Get Started" to access the login page</li>
                      <li>Enter your username and password</li>
                      <li>Access your dashboard and available features</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Troubleshooting</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Ensure you have a stable internet connection</li>
                      <li>Clear browser cache if experiencing issues</li>
                      <li>Update the mobile app to the latest version</li>
                      <li>Contact support for persistent issues</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {showQuickLinksModal === 'support' && (
                <div className="space-y-4 text-gray-700">
                  <h3 className="text-lg font-semibold mb-3">Support Center</h3>
                  
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Contact Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Email:</strong> studtech1234@gmail.com</p>
                      <p><strong>Office Hours:</strong> Monday - Friday, 8:00 AM - 5:00 PM</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Location</h4>
                    <p className="text-sm">
                      Western Mindanao State University<br />
                      Campus B, College of Computing Studies Building<br />
                      Normal Road, Baliwasan, Zamboanga City
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Common Issues</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li><strong>Login Problems:</strong> Check credentials and reset password if needed</li>
                      <li><strong>App Installation:</strong> Enable "Unknown Sources" in Android settings</li>
                      <li><strong>Sync Issues:</strong> Refresh the app or restart your device</li>
                      <li><strong>Performance:</strong> Clear cache and ensure stable internet</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Resources</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Developers help will be conducted</li>
                      <li>Regular training sessions for faculty and staff</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {showQuickLinksModal === 'privacy' && (
                <div className="space-y-4 text-gray-700">
                  <h3 className="text-lg font-semibold mb-3">Privacy Policy</h3>
                  
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Data Collection</h4>
                    <p className="text-sm mb-2">
                      WMSU ILS collects and processes personal information in accordance with the Data Privacy Act of 2012.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Name, student/employee ID</li>
                      <li>Contact information (email, phone)</li>
                      <li>Academic records and performance data</li>
                      <li>System usage and access logs</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Data Protection</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Encrypted data transmission and storage</li>
                      <li>Secure authentication protocols</li>
                      <li>Regular security audits and updates</li>
                      <li>Limited access to authorized personnel only</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Your Rights</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Right to access your personal data</li>
                      <li>Right to correct inaccurate information</li>
                      <li>Right to request data deletion</li>
                      <li>Right to file complaints with the NPC</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Contact for Privacy Concerns</h4>
                    <p className="text-sm">
                      For privacy-related inquiries, contact our Data Protection Officer at:<br />
                      <strong>Email:</strong> studtech1234@gmail.com<br />
                    </p>
                  </div>
                  
                  <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                    <p><strong>Last Updated:</strong> April 2026</p>
                    <p>This privacy policy is subject to change without prior notice.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
