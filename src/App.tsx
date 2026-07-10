import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from './lib/firebase';
import { Resume, JobApplication } from './types';

// Icons for Auth
import {
  Sparkles,
  Mail,
  Lock,
  User as UserIcon,
  AlertCircle,
  RefreshCw,
  Chrome
} from 'lucide-react';

// Sub components
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ResumeBuilder from './components/ResumeBuilder';
import ResumeImport from './components/ResumeImport';
import ATSChecker from './components/ATSChecker';
import ResumeOptimizer from './components/ResumeOptimizer';
import CoverLetterGenerator from './components/CoverLetterGenerator';
import JobTracker from './components/JobTracker';
import JobMatch from './components/JobMatch';
import AICareerChat from './components/AICareerChat';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Auth form states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // App core states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [latestATSScore, setLatestATSScore] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Track user login status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        fetchUserData(currentUser.uid);
      } else {
        setResumes([]);
        setApplications([]);
        setSelectedResumeId(null);
      }
    });
    return unsubscribe;
  }, []);

  // Fetch Firestore records for signed-in user
  const fetchUserData = async (uid: string) => {
    setDataLoading(true);
    try {
      // 1. Fetch Resumes
      const resumesQuery = query(
        collection(db, 'resumes'),
        where('ownerId', '==', uid)
      );
      const resumesSnap = await getDocs(resumesQuery);
      const resumesList: Resume[] = [];
      resumesSnap.forEach((doc) => {
        resumesList.push({ id: doc.id, ...doc.data() } as Resume);
      });
      setResumes(resumesList);

      // Pre-select first resume if nothing selected
      if (resumesList.length > 0 && !selectedResumeId) {
        setSelectedResumeId(resumesList[0].id);
      }

      // 2. Fetch Job Applications
      const jobsQuery = query(
        collection(db, 'jobApplications'),
        where('ownerId', '==', uid)
      );
      const jobsSnap = await getDocs(jobsQuery);
      const jobsList: JobApplication[] = [];
      jobsSnap.forEach((doc) => {
        jobsList.push({ id: doc.id, ...doc.data() } as JobApplication);
      });
      setApplications(jobsList);
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  // Triggers manual refetch when collections are modified
  const handleRefresh = async () => {
    if (user) {
      await fetchUserData(user.uid);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await signOut(auth);
    setActiveTab('dashboard');
  };

  // Sign in with Google
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup blocked. Please use the Email & Password login, or enable popups.');
      } else {
        setAuthError(err.message || 'Failed Google Authentication.');
      }
    }
  };

  // Email and Password Login or Sign Up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email.trim() || !password.trim()) {
      setAuthError('Please fill in all email and password fields.');
      return;
    }

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          setAuthError('Please enter your full name to sign up.');
          return;
        }
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName });
        setUser({ ...credential.user, displayName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Credentials authentication failed.');
    }
  };

  // Launch secure Guest Account automatically for frictionless evaluation
  const handleGuestLogin = async () => {
    setAuthError(null);
    const guestEmail = 'guest@careerpilot.ai';
    const guestPassword = 'guestpassword';

    try {
      await signInWithEmailAndPassword(auth, guestEmail, guestPassword);
    } catch (err: any) {
      // If guest doesn't exist, create it in real-time on-the-fly!
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const credential = await createUserWithEmailAndPassword(auth, guestEmail, guestPassword);
          await updateProfile(credential.user, { displayName: 'Guest Seeker' });
          setUser({ ...credential.user, displayName: 'Guest Seeker' });
        } catch (signUpErr: any) {
          console.error(signUpErr);
          setAuthError('Could not launch the guest workspace. Please register a custom account.');
        }
      } else {
        setAuthError('Could not launch the guest workspace. Please register a custom account.');
      }
    }
  };

  // Show beautiful loading screen during Firebase bootstrap
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-700 uppercase tracking-widest font-sans">Bootstrapping CareerPilot AI...</p>
      </div>
    );
  }

  // Render Authentication Screen if not signed in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-8 space-y-6">
          {/* Logo Brand */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="font-sans text-2xl font-black text-slate-900 tracking-tight">CareerPilot AI</h1>
            <p className="text-xs text-slate-500 max-w-xs leading-normal">
              An offline-first career-coaching hub for resumes, cover letters, and live ATS keyword scans.
            </p>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                  placeholder="jane.doe@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {authError && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 leading-normal">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {isSignUp ? 'Register My Profile' : 'Sign In'}
            </button>
          </form>

          {/* Social login divider */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="h-px bg-slate-200 flex-1"></span>
            <span className="px-3 font-semibold uppercase tracking-wider text-[10px]">Or Continue With</span>
            <span className="h-px bg-slate-200 flex-1"></span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              id="auth-google-btn"
              onClick={handleGoogleSignIn}
              className="flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 py-2 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
            >
              <Chrome className="h-4 w-4 text-red-500" />
              Google
            </button>

            <button
              id="auth-guest-btn"
              onClick={handleGuestLogin}
              className="flex items-center justify-center gap-2 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-lg text-xs font-bold text-indigo-800 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Guest Entry
            </button>
          </div>

          {/* Selector Switcher */}
          <p className="text-center text-xs text-slate-500">
            {isSignUp ? 'Already have an account?' : 'New to CareerPilot?'}
            <button
              id="auth-toggle-btn"
              onClick={() => { setIsSignUp(!isSignUp); setAuthError(null); }}
              className="text-indigo-600 font-bold ml-1.5 hover:underline cursor-pointer"
            >
              {isSignUp ? 'Sign In' : 'Create an Account'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Signed In - Main layout container
  return (
    <div className="min-h-screen bg-slate-50 pl-64 text-slate-800">
      {/* Persistent Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onSignOut={handleSignOut}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
      />

      {/* Main Tab Panel Content Area */}
      <main className="min-h-screen p-8 max-w-7xl mx-auto">
        {dataLoading ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-center">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Synchronizing profile collections...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'dashboard' && (
              <Dashboard
                resumes={resumes}
                applications={applications}
                setActiveTab={setActiveTab}
                latestATSScore={latestATSScore}
              />
            )}

            {activeTab === 'resume-builder' && (
              <ResumeBuilder
                resumes={resumes}
                userUid={user.uid}
                onRefresh={handleRefresh}
                selectedResumeId={selectedResumeId}
                setSelectedResumeId={setSelectedResumeId}
              />
            )}

            {activeTab === 'resume-import' && (
              <ResumeImport
                userUid={user.uid}
                onRefresh={handleRefresh}
                setSelectedResumeId={setSelectedResumeId}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'ats-checker' && (
              <ATSChecker
                resumes={resumes}
                onCheckComplete={(score) => setLatestATSScore(score)}
              />
            )}

            {activeTab === 'resume-optimizer' && (
              <ResumeOptimizer
                resumes={resumes}
                onRefresh={handleRefresh}
              />
            )}

            {activeTab === 'cover-letter' && (
              <CoverLetterGenerator
                resumes={resumes}
                applications={applications}
                userUid={user.uid}
              />
            )}

            {activeTab === 'job-tracker' && (
              <JobTracker
                applications={applications}
                userUid={user.uid}
                onRefresh={handleRefresh}
              />
            )}

            {activeTab === 'job-match' && (
              <JobMatch
                resumes={resumes}
                applications={applications}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating sliding chat overlay panel */}
      <AICareerChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        resumes={resumes}
        applications={applications}
        userUid={user.uid}
      />
    </div>
  );
}
