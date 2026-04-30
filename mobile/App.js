import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { API_BASE_URL } from './src/config';

const TOKEN_KEY = 'auth_token';
const ANDROID_TOP_INSET = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
const TIMETABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ALL_GRADES_FILTER = 'All Grades';
const COURSE_GRADE_OPTIONS = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'];
const BRAND_NAME = 'NEW KRISHNA EDUCATION CENTER-KODIKAMAM';
const TIMETABLE_HALL_OPTIONS = ['Hall 1', 'Hall 2', 'Hall 3', 'Hall 4', 'Hall 5'];
const TIMETABLE_TIME_SLOTS = [
  { start: '07:30', end: '08:30' },
  { start: '08:30', end: '09:30' },
  { start: '09:30', end: '10:30' },
  { start: '10:30', end: '11:30' },
  { start: '11:30', end: '12:30' },
  { start: '13:30', end: '14:30' },
  { start: '14:30', end: '15:30' },
  { start: '15:30', end: '16:30' },
  { start: '16:30', end: '17:30' },
  { start: '17:30', end: '18:30' },
];
const EXAM_TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3'];
const SUGGESTION_STATUS_OPTIONS = ['Open', 'In Review', 'Resolved', 'Closed'];
const LEAVE_REQUEST_STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected'];

// ─────────────────────────────────────────────────────────────────────────────
// API Helper
// ─────────────────────────────────────────────────────────────────────────────
const request = async (path, { method = 'GET', token, body } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
};

const splitFullName = (fullName) => {
  const trimmedName = String(fullName || '').trim();
  const nameParts = trimmedName.split(/\s+/).filter(Boolean);

  if (nameParts.length < 2) {
    return { firstName: '', lastName: '' };
  }

  return {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' '),
  };
};

const formatCourseLabel = (course) => {
  const subject = String(course?.subject || course?.name || '').trim();
  const grade = String(course?.grade || '').trim();
  return [subject, grade].filter(Boolean).join(' - ') || 'Untitled Class';
};

const findCourseForTimetableEntry = (entry, courses = []) => {
  const directCourseId = entry?.courseId?._id || entry?.courseId || '';
  if (directCourseId) {
    const matchedById = courses.find((course) => String(course._id) === String(directCourseId));
    if (matchedById) return matchedById;
  }

  const title = String(entry?.title || '').trim();
  const subject = String(entry?.subject || '').trim();
  if (!title && !subject) return null;

  const titleMatches = title
    ? courses.filter((course) => {
      const courseName = String(course?.name || '').trim();
      const courseSubject = String(course?.subject || '').trim();
      const courseLabel = formatCourseLabel(course);
      return [courseLabel, courseName, courseSubject].includes(title);
    })
    : [];
  if (titleMatches.length === 1) {
    return titleMatches[0];
  }

  const subjectMatches = subject
    ? courses.filter((course) => {
      const courseName = String(course?.name || '').trim();
      const courseSubject = String(course?.subject || '').trim();
      return [courseName, courseSubject].includes(subject);
    })
    : [];
  if (subjectMatches.length === 1) {
    return subjectMatches[0];
  }

  return null;
};

const formatTimetableEntryTitle = (entry, courses = []) => {
  const matchedCourse = findCourseForTimetableEntry(entry, courses);
  if (matchedCourse) {
    return formatCourseLabel(matchedCourse);
  }

  const title = String(entry?.title || '').trim();
  const grade = String(entry?.grade || '').trim();
  if (title && grade && !title.includes(grade)) {
    return `${title} - ${grade}`;
  }

  return title || grade || 'Untitled Class';
};

const formatTimetableTime = (timeValue) => {
  const [hourText, minuteText] = String(timeValue || '').split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return String(timeValue || '');
  }

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const formatAppDate = (dateValue) => {
  const parsedDate = dateValue ? new Date(dateValue) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return '-';
  }
  return parsedDate.toLocaleDateString('en-CA');
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const AuthScreen = ({ onAuthenticated }) => {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState('');
  const [requestedRole, setRequestedRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const isRegister = mode === 'register';

  const submit = async () => {
    if (!email || !password || (isRegister && !name)) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }
    if (isRegister && requestedRole === 'teacher' && !subject.trim()) {
      Alert.alert('Missing Fields', 'Subject is required for tutor registration.');
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        const body = { name, email, password, requestedRole, subject: subject.trim() };
        const data = await request('/api/auth/register', { method: 'POST', body });
        Alert.alert(
          'Registration Submitted',
          data.message || 'Your account request is pending admin approval.',
        );
        setMode('login');
        setName('');
        setSubject('');
        setPassword('');
        return;
      }

      const data = await request('/api/auth/login', { method: 'POST', body: { email, password } });
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      onAuthenticated(data.token, data.user || null);
    } catch (error) {
      Alert.alert('Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const testBackendConnection = async () => {
    if (checkingConnection) return;
    setCheckingConnection(true);
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      const message = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      Alert.alert(
        'Connection OK',
        `Backend is reachable.\n\nURL: ${API_BASE_URL}\nResponse: ${message || 'No message'}`,
      );
    } catch (error) {
      Alert.alert(
        'Connection Failed',
        `Could not reach backend.\n\nURL: ${API_BASE_URL}\nReason: ${error.message}`,
      );
    } finally {
      setCheckingConnection(false);
    }
  };

  return (
    <SafeAreaView style={auth.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={auth.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo area */}
          <View style={auth.logoArea}>
            <View style={auth.logoCircle}>
              <Text style={auth.logoIcon}>🎓</Text>
            </View>
            <Text style={auth.appName}>TuitionApp</Text>
            <Text style={auth.tagline}>Smart Learning Management</Text>
          </View>

          {/* Card */}
          <View style={auth.card}>
            {/* Tab switcher */}
            <View style={auth.tabRow}>
              <TouchableOpacity
                style={[auth.tab, mode === 'login' && auth.tabActive]}
                onPress={() => setMode('login')}
              >
                <Text style={[auth.tabText, mode === 'login' && auth.tabTextActive]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[auth.tab, mode === 'register' && auth.tabActive]}
                onPress={() => setMode('register')}
              >
                <Text style={[auth.tabText, mode === 'register' && auth.tabTextActive]}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            {isRegister && (
              <View style={auth.inputWrap}>
                <Text style={auth.inputLabel}>Full Name</Text>
                <TextInput
                  placeholder="Enter your full name"
                  value={name}
                  onChangeText={setName}
                  style={auth.input}
                  showSoftInputOnFocus
                  autoCorrect={false}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            )}

            {isRegister && (
              <View style={auth.inputWrap}>
                <Text style={auth.inputLabel}>Register As</Text>
                <View style={auth.roleRow}>
                  <TouchableOpacity
                    style={[auth.roleBtn, requestedRole === 'student' && auth.roleBtnActive]}
                    onPress={() => setRequestedRole('student')}
                  >
                    <Text style={[auth.roleBtnText, requestedRole === 'student' && auth.roleBtnTextActive]}>
                      Student
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[auth.roleBtn, requestedRole === 'teacher' && auth.roleBtnActive]}
                    onPress={() => setRequestedRole('teacher')}
                  >
                    <Text style={[auth.roleBtnText, requestedRole === 'teacher' && auth.roleBtnTextActive]}>
                      Tutor
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={auth.helperText}>Admin approval is required before first login.</Text>
              </View>
            )}

            {isRegister && requestedRole === 'teacher' && (
              <View style={auth.inputWrap}>
                <Text style={auth.inputLabel}>Subject</Text>
                <TextInput
                  placeholder="Enter your subject"
                  value={subject}
                  onChangeText={setSubject}
                  style={auth.input}
                  showSoftInputOnFocus
                  autoCorrect={false}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            )}

            <View style={auth.inputWrap}>
              <Text style={auth.inputLabel}>Email Address</Text>
              <TextInput
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                style={auth.input}
                autoCapitalize="none"
                keyboardType="email-address"
                showSoftInputOnFocus
                autoCorrect={false}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={auth.inputWrap}>
              <Text style={auth.inputLabel}>Password</Text>
              <TextInput
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                style={auth.input}
                secureTextEntry
                showSoftInputOnFocus
                placeholderTextColor="#94a3b8"
              />
            </View>

            <TouchableOpacity style={auth.btn} onPress={submit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={auth.btnText}>{isRegister ? 'Submit Request' : 'Sign In'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[auth.testBtn, checkingConnection && auth.testBtnDisabled]}
              onPress={testBackendConnection}
              disabled={checkingConnection}
            >
              <Text style={auth.testBtnText}>
                {checkingConnection ? 'Testing Connection...' : 'Test Backend Connection'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={auth.version}>API: {API_BASE_URL}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const auth = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  logoIcon: { fontSize: 36 },
  appName: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  tagline: { fontSize: 14, color: '#64748b', marginTop: 4 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#0ea5e9' },
  tabText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  inputWrap: { marginBottom: 14 },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleBtnActive: {
    borderColor: '#0ea5e9',
    backgroundColor: '#082f49',
  },
  roleBtnText: { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  roleBtnTextActive: { color: '#38bdf8' },
  helperText: { marginTop: 8, color: '#64748b', fontSize: 11 },
  inputLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  btn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  testBtn: {
    borderColor: '#0ea5e9',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#0f172a',
  },
  testBtnDisabled: {
    opacity: 0.7,
  },
  testBtnText: { color: '#38bdf8', fontWeight: '700', fontSize: 14 },
  version: { color: '#334155', fontSize: 11, textAlign: 'center', marginTop: 20 },
});

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({ icon, number, label, color }) => (
  <View style={[shared.statCard, { borderTopColor: color }]}>
    <Text style={shared.statIcon}>{icon}</Text>
    <Text style={[shared.statNum, { color }]}>{number}</Text>
    <Text style={shared.statLabel}>{label}</Text>
  </View>
);

const SectionHeader = ({ title, action, actionLabel }) => (
  <View style={shared.sectionHeader}>
    <Text style={shared.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={action}>
        <Text style={shared.sectionAction}>{actionLabel || 'Refresh'}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const WebDashboardShell = ({
  welcome,
  roleLabel,
  user,
  activeTab,
  onTabChange,
  menuItems,
  onLogout,
  onOpenProfile,
  children,
}) => (
  <SafeAreaView style={webDash.page}>
    <View style={[webDash.header, { paddingTop: 12 + ANDROID_TOP_INSET }]}>
      <View style={webDash.brandBlock}>
        <View style={webDash.logoCircle}>
          <Text style={webDash.logoText}>NK</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={webDash.roleLabel}>{roleLabel}</Text>
          <Text style={webDash.brandName}>{BRAND_NAME}</Text>
          <Text style={webDash.welcome}>{welcome}</Text>
        </View>
      </View>
      <View style={webDash.headerActions}>
        <TouchableOpacity style={webDash.profileButton} onPress={onOpenProfile}>
          <Text style={webDash.profileIcon}>
            {(user?.name || 'U').split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={webDash.logoutButton} onPress={onLogout}>
          <Text style={webDash.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>

    <View style={webDash.body}>
      <View style={webDash.sidebar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={webDash.menuScroll}
        >
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.key || item.label}
              style={[
                webDash.menuButton,
                activeTab === item.key && webDash.menuButtonActive,
                item.disabled && webDash.menuButtonDisabled,
              ]}
              onPress={() => !item.disabled && item.key && onTabChange(item.key)}
              disabled={item.disabled}
            >
              <Text style={[
                webDash.menuText,
                activeTab === item.key && webDash.menuTextActive,
                item.disabled && webDash.menuTextDisabled,
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={webDash.mainScroll}>
        <View style={webDash.contentPanel}>
          {children}
        </View>
      </View>
    </View>
  </SafeAreaView>
);

const WebPageTitle = ({ title, subtitle }) => (
  <View style={webDash.pageTitleBlock}>
    <Text style={webDash.pageTitle}>{title}</Text>
    <Text style={webDash.pageSubtitle}>{subtitle}</Text>
  </View>
);

const WebMetricCard = ({ label, value, accent = '#2563eb', badge, detail, progress }) => (
  <View style={[webDash.metricCard, { borderLeftColor: accent }]}>
    <View style={webDash.metricHeader}>
      <View style={{ flex: 1 }}>
        <Text style={webDash.metricLabel}>{label}</Text>
        <Text style={[webDash.metricValue, { color: detail ? '#0f172a' : accent }]}>{value}</Text>
      </View>
      {badge ? (
        <View style={[webDash.metricBadge, { backgroundColor: accent }]}>
          <Text style={webDash.metricBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
    {detail ? <Text style={webDash.metricDetail}>{detail}</Text> : null}
    {progress !== undefined ? (
      <View style={webDash.progressTrack}>
        <View style={[webDash.progressFill, { width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: accent }]} />
      </View>
    ) : null}
  </View>
);

const StatusPill = ({ label, tone = 'blue' }) => (
  <View style={[webDash.statusPill, webDash[`status_${tone}`]]}>
    <Text style={[webDash.statusText, webDash[`statusText_${tone}`]]}>{label}</Text>
  </View>
);

const DetailField = ({ label, value }) => (
  <View style={webDash.detailField}>
    <Text style={webDash.detailLabel}>{label}</Text>
    <Text style={webDash.detailValue}>{value || '-'}</Text>
  </View>
);

const shared = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statNum: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sectionAction: { fontSize: 13, color: '#0ea5e9', fontWeight: '700' },
});

const webDash = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4f7fb' },
  header: {
    backgroundColor: '#233f92',
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  brandBlock: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e5e7eb',
    borderWidth: 2,
    borderColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#1e293b', fontSize: 11, fontWeight: '900' },
  roleLabel: { color: '#fff', fontSize: 12, fontWeight: '900' },
  brandName: { color: '#dbeafe', fontSize: 9, fontWeight: '800', marginTop: 2, lineHeight: 13 },
  welcome: { color: '#fff', fontSize: 19, fontWeight: '900', marginTop: 8 },
  headerActions: { flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: { color: '#0f172a', fontWeight: '900', fontSize: 12 },
  logoutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  body: { flex: 1, flexDirection: 'column' },
  sidebar: {
    width: '100%',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuScroll: { paddingHorizontal: 12, gap: 8 },
  menuButton: {
    minHeight: 38,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  menuButtonDisabled: { opacity: 0.65 },
  menuText: { color: '#111827', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  menuTextActive: { color: '#fff' },
  menuTextDisabled: { color: '#64748b' },
  userCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  userName: { color: '#111827', fontSize: 12, fontWeight: '900' },
  userEmail: { color: '#64748b', fontSize: 10, marginTop: 4 },
  mainScroll: { flex: 1 },
  mainScrollContent: { padding: 0, paddingBottom: 0 },
  contentPanel: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  pageTitleBlock: { marginBottom: 14 },
  pageTitle: { color: '#111827', fontSize: 24, fontWeight: '900' },
  pageSubtitle: { color: '#64748b', fontSize: 13, lineHeight: 19, marginTop: 6 },
  metricGrid: { gap: 10 },
  metricCard: {
    width: '100%',
    minHeight: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    backgroundColor: '#fff',
    padding: 14,
  },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  metricValue: { color: '#111827', fontSize: 24, fontWeight: '900', marginTop: 8 },
  metricBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  metricDetail: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 8 },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: '#e2e8f0', marginTop: 14, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 4 },
  filterBar: {
    gap: 14,
    backgroundColor: '#eef6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  filterField: { width: '100%' },
  filterLabel: { color: '#475569', fontSize: 12, fontWeight: '900', marginBottom: 8 },
  selectBox: {
    height: 40,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  selectText: { color: '#111827', fontSize: 13, fontWeight: '700' },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    backgroundColor: '#fff',
  },
  sectionTitle: { color: '#111827', fontSize: 17, fontWeight: '900' },
  sectionText: { color: '#64748b', fontSize: 13, lineHeight: 20, marginTop: 8 },
  detailGrid: { gap: 10 },
  detailField: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 9,
    padding: 16,
    backgroundColor: '#fff',
  },
  detailLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  detailValue: { color: '#1f2937', fontSize: 14, fontWeight: '800', marginTop: 10 },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  tableHeader: { backgroundColor: '#f8fafc', minHeight: 48 },
  tableCell: { flexGrow: 1, flexBasis: 128, paddingHorizontal: 10, paddingVertical: 10 },
  tableCellWide: { flexGrow: 1, flexBasis: 170, paddingHorizontal: 10, paddingVertical: 10 },
  tableCellSmall: { flexGrow: 1, flexBasis: 74, paddingHorizontal: 10, paddingVertical: 10 },
  tableHeadText: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  tableText: { color: '#334155', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buttonBlue: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  buttonGreen: { backgroundColor: '#16a34a', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  buttonRed: { backgroundColor: '#dc2626', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  buttonSoft: { backgroundColor: '#eaf2ff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  buttonTextLight: { color: '#fff', fontSize: 12, fontWeight: '900' },
  buttonTextBlue: { color: '#1d4ed8', fontSize: 12, fontWeight: '900' },
  statusPill: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  status_green: { backgroundColor: '#dcfce7' },
  status_yellow: { backgroundColor: '#fef3c7' },
  status_red: { backgroundColor: '#fee2e2' },
  status_blue: { backgroundColor: '#dbeafe' },
  status_pink: { backgroundColor: '#fee2e2' },
  statusText_green: { color: '#166534' },
  statusText_yellow: { color: '#92400e' },
  statusText_red: { color: '#991b1b' },
  statusText_blue: { color: '#1d4ed8' },
  statusText_pink: { color: '#991b1b' },
  statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  segmentButton: {
    flexGrow: 1,
    minWidth: 96,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segmentButtonActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  segmentText: { color: '#111827', fontSize: 13, fontWeight: '900' },
  segmentTextActive: { color: '#fff' },
  formInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    minHeight: 42,
    paddingHorizontal: 12,
    color: '#111827',
    backgroundColor: '#fff',
    marginTop: 8,
  },
  textArea: { minHeight: 82, paddingTop: 12, textAlignVertical: 'top' },
  twoColumn: { gap: 12, marginTop: 14 },
  halfPanel: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 18,
    backgroundColor: '#fff',
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 16,
    marginTop: 14,
    alignItems: 'center',
  },
  emptyText: { color: '#64748b', fontSize: 13, fontWeight: '800', textAlign: 'center' },
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const AdminDashboard = ({ token, user, onUserUpdated, onLogout }) => {
  const [stats, setStats] = useState({ students: 0, courses: 0, enrollments: 0, pendingApprovals: 0 });
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [reviewingRequestId, setReviewingRequestId] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // overview | students | courses | timetable | approvals
  const [approvalView, setApprovalView] = useState('student'); // student | teacher
  const [selectedExamGrade, setSelectedExamGrade] = useState(COURSE_GRADE_OPTIONS[0]);
  const [selectedExamTerm, setSelectedExamTerm] = useState(EXAM_TERM_OPTIONS[0]);
  const [profileName, setProfileName] = useState(user.name || '');
  const [profileEmail, setProfileEmail] = useState(user.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [adminSuggestionTitle, setAdminSuggestionTitle] = useState('');
  const [adminSuggestionMessage, setAdminSuggestionMessage] = useState('');
  const [adminSuggestions, setAdminSuggestions] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selectedLeaveRequestId, setSelectedLeaveRequestId] = useState('');
  const [leaveReviewStatus, setLeaveReviewStatus] = useState('Pending');
  const [leaveAdminReply, setLeaveAdminReply] = useState('');
  const [savingLeaveReview, setSavingLeaveReview] = useState(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState('');
  const [suggestionReviewStatus, setSuggestionReviewStatus] = useState(SUGGESTION_STATUS_OPTIONS[0]);
  const [suggestionReply, setSuggestionReply] = useState('');
  const [suggestionAdminNote, setSuggestionAdminNote] = useState('');
  const [savingSuggestionReview, setSavingSuggestionReview] = useState(false);
  const [submittingAdminSuggestion, setSubmittingAdminSuggestion] = useState(false);

  // Add student form
  const [studentFullName, setStudentFullName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [creating, setCreating] = useState(false);

  // Add course form
  const [cSubject, setCSubject] = useState('');
  const [cGrade, setCGrade] = useState('');
  const [showGradeOptions, setShowGradeOptions] = useState(false);
  const [courseFilterGrade, setCourseFilterGrade] = useState(ALL_GRADES_FILTER);
  const [showCourseFilterOptions, setShowCourseFilterOptions] = useState(false);
  const [cFee, setCFee] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [timetable, setTimetable] = useState([]);
  const [ttGrade, setTtGrade] = useState('');
  const [showTtGradeOptions, setShowTtGradeOptions] = useState(false);
  const [ttCourseId, setTtCourseId] = useState('');
  const [showTtCourseOptions, setShowTtCourseOptions] = useState(false);
  const [ttDay, setTtDay] = useState(TIMETABLE_DAYS[0]);
  const [ttStart, setTtStart] = useState('');
  const [ttEnd, setTtEnd] = useState('');
  const [showTtStartOptions, setShowTtStartOptions] = useState(false);
  const [showTtEndOptions, setShowTtEndOptions] = useState(false);
  const [ttTitle, setTtTitle] = useState('');
  const [ttSubject, setTtSubject] = useState('');
  const [ttRoom, setTtRoom] = useState('');
  const [showTtHallOptions, setShowTtHallOptions] = useState(false);
  const [ttTutor, setTtTutor] = useState('');
  const [showTtTutorOptions, setShowTtTutorOptions] = useState(false);
  const [ttSaving, setTtSaving] = useState(false);
  const [ttEditingId, setTtEditingId] = useState('');
  const [ttDeletingId, setTtDeletingId] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sData, cData, eData, pData, tData, tutorData, suggestionData, leaveRequestData] = await Promise.all([
        request('/api/students', { token }),
        request('/api/courses', { token }),
        request('/api/enrollments', { token }),
        request('/api/users/pending-registrations', { token }),
        request('/api/timetable', { token }),
        request('/api/users/tutors', { token }),
        request('/api/suggestions', { token }),
        request('/api/leave-requests', { token }),
      ]);
      const loadedCourses = cData.courses || [];
      setStudents(sData.students || []);
      setCourses(loadedCourses);
      setTutors(tutorData.tutors || []);
      setAdminSuggestions(suggestionData.suggestions || []);
      setLeaveRequests(leaveRequestData.leaveRequests || []);
      setPendingRequests(pData.requests || []);
      setTimetable(tData.timetable || []);
      setStats({
        students: sData.count || 0,
        courses: cData.count || 0,
        enrollments: eData.count || 0,
        pendingApprovals: pData.count || 0,
      });
    } catch (e) {
      Alert.alert('Load Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    setProfileName(user.name || '');
    setProfileEmail(user.email || '');
  }, [user.name, user.email]);
  useEffect(() => {
    if (!selectedSuggestionId) return;
    const matchedSuggestion = adminSuggestions.find((item) => item._id === selectedSuggestionId);
    if (!matchedSuggestion) return;
    setSuggestionReviewStatus(matchedSuggestion.status || 'Open');
    setSuggestionReply(matchedSuggestion.reply || '');
    setSuggestionAdminNote(matchedSuggestion.adminNote || '');
  }, [adminSuggestions, selectedSuggestionId]);
  useEffect(() => {
    if (!selectedLeaveRequestId) return;
    const matchedLeaveRequest = leaveRequests.find((item) => item._id === selectedLeaveRequestId);
    if (!matchedLeaveRequest) return;
    setLeaveReviewStatus(matchedLeaveRequest.status || 'Pending');
    setLeaveAdminReply(matchedLeaveRequest.adminReply || '');
  }, [leaveRequests, selectedLeaveRequestId]);

  const addStudent = async () => {
    const fullName = studentFullName.trim();
    const email = sEmail.trim();
    const phone = sPhone.trim();
    const { firstName, lastName } = splitFullName(fullName);

    if (!fullName || !email || !phone) {
      Alert.alert('Missing Fields', 'Full name, email, and contact number are required.');
      return;
    }
    if (!firstName || !lastName) {
      Alert.alert('Invalid Name', 'Please enter the full name with at least first and last name.');
      return;
    }
    setCreating(true);
    try {
      const data = await request('/api/students', {
        method: 'POST', token,
        body: { firstName, lastName, email, phone, status: 'active' },
      });
      setStudentFullName('');
      setSEmail('');
      setSPhone('');
      await loadAll();
      Alert.alert(
        'Student Added',
        `Student added successfully.\n\nLogin email: ${data.loginEmail || email}\nTemporary password: ${data.temporaryPassword || 'Not available'}\n\nThe student must change this password after the first login.`,
      );
      return;
      Alert.alert('✅ Success', 'Student added successfully.');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setCreating(false); }
  };

  const addCourse = async () => {
    const subject = cSubject.trim();
    const grade = cGrade.trim();

    if (!subject || !grade) {
      Alert.alert('Missing Fields', 'Subject and grade are required.');
      return;
    }

    const codePrefix = subject.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'COURSE';
    const generatedCode = `${codePrefix}${Date.now().toString().slice(-6)}`;

    setCreatingCourse(true);
    try {
      await request('/api/courses', {
        method: 'POST',
        token,
        body: {
          name: subject,
          code: generatedCode,
          subject,
          grade,
          fee: Number(cFee) || 0,
          status: 'active',
        },
      });
      setCSubject('');
      setCGrade('');
      setShowGradeOptions(false);
      setCFee('');
      await loadAll();
      Alert.alert('Success', 'Course added successfully.');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setCreatingCourse(false); }
  };

  const resetTimetableForm = () => {
    setTtGrade('');
    setShowTtGradeOptions(false);
    setTtCourseId('');
    setShowTtCourseOptions(false);
    setTtDay(TIMETABLE_DAYS[0]);
    setTtStart('');
    setTtEnd('');
    setShowTtStartOptions(false);
    setShowTtEndOptions(false);
    setTtTitle('');
    setTtSubject('');
    setTtRoom('');
    setShowTtHallOptions(false);
    setTtTutor('');
    setShowTtTutorOptions(false);
    setTtEditingId('');
  };

  const selectTimetableGrade = (grade) => {
    setTtGrade(grade);
    setShowTtGradeOptions(false);
    setTtCourseId('');
    setShowTtCourseOptions(false);
    setTtTitle('');
    setTtSubject('');
    setTtRoom('');
    setTtTutor('');
    setShowTtTutorOptions(false);
  };

  const selectTimetableCourse = (course) => {
    setTtCourseId(course._id);
    setShowTtCourseOptions(false);
    setTtGrade(course.grade || '');
    setTtTitle(course.subject || course.name || '');
    setTtSubject(course.subject || course.name || '');
    setTtRoom(TIMETABLE_HALL_OPTIONS.includes(course.hallAllocation) ? course.hallAllocation : '');
    setShowTtHallOptions(false);
    setTtTutor('');
    setShowTtTutorOptions(false);
  };

  const beginTimetableEdit = (entry) => {
    const matchedCourse = findCourseForTimetableEntry(entry, courses);
    const matchedCourseId = matchedCourse?._id || entry?.courseId?._id || entry?.courseId || '';
    setTtGrade(matchedCourse?.grade || entry?.grade || '');
    setShowTtGradeOptions(false);
    setTtCourseId(matchedCourseId);
    setShowTtCourseOptions(false);
    setTtEditingId(entry._id);
    setTtDay(entry.dayOfWeek || TIMETABLE_DAYS[0]);
    setTtStart(entry.startTime || '');
    setTtEnd(entry.endTime || '');
    setShowTtStartOptions(false);
    setShowTtEndOptions(false);
    setTtTitle(entry.subject || matchedCourse?.subject || matchedCourse?.name || entry.title || '');
    setTtSubject(entry.subject || matchedCourse?.subject || matchedCourse?.name || '');
    setTtRoom(TIMETABLE_HALL_OPTIONS.includes(entry.room) ? entry.room : '');
    setShowTtHallOptions(false);
    setTtTutor(entry.tutorName || '');
    setShowTtTutorOptions(false);
  };

  const selectTimetableStartTime = (slot) => {
    setTtStart(slot.start);
    setTtEnd(slot.end);
    setShowTtStartOptions(false);
    setShowTtEndOptions(false);
  };

  const selectTimetableEndTime = (slot) => {
    setTtStart(slot.start);
    setTtEnd(slot.end);
    setShowTtEndOptions(false);
  };

  const selectTimetableHall = (hall) => {
    setTtRoom(hall);
    setShowTtHallOptions(false);
  };

  const selectTimetableTutor = (tutorName) => {
    setTtTutor(tutorName);
    setShowTtTutorOptions(false);
  };

  const saveTimetable = async () => {
    const selectedCourse = courses.find((course) => course._id === ttCourseId) || null;
    const selectedTimeSlot = TIMETABLE_TIME_SLOTS.find((slot) => slot.start === ttStart && slot.end === ttEnd) || null;
    const timetableTitle = selectedCourse
      ? String(selectedCourse.subject || selectedCourse.name || '').trim()
      : ttTitle.trim();

    if (!ttGrade || !ttCourseId || !ttDay || !ttStart || !ttEnd || !timetableTitle) {
      Alert.alert('Missing Fields', 'Grade, subject, day, start time, and end time are required.');
      return;
    }
    if (!selectedTimeSlot) {
      Alert.alert('Invalid Time', 'Please select a valid 1-hour time slot.');
      return;
    }

    setTtSaving(true);
    try {
      const isEdit = Boolean(ttEditingId);
      const body = {
        courseId: ttCourseId,
        dayOfWeek: ttDay,
        startTime: ttStart,
        endTime: ttEnd,
        title: timetableTitle,
        subject: ttSubject,
        grade: selectedCourse?.grade || '',
        room: ttRoom,
        tutorName: ttTutor,
      };

      if (isEdit) {
        await request(`/api/timetable/${ttEditingId}`, { method: 'PUT', token, body });
      } else {
        await request('/api/timetable', { method: 'POST', token, body });
      }

      resetTimetableForm();
      await loadAll();
      Alert.alert('Success', isEdit ? 'Timetable updated.' : 'Timetable entry created.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setTtSaving(false);
    }
  };

  const deleteTimetableEntry = async (entryId) => {
    setTtDeletingId(entryId);
    try {
      await request(`/api/timetable/${entryId}`, { method: 'DELETE', token });
      if (ttEditingId === entryId) {
        resetTimetableForm();
      }
      await loadAll();
      Alert.alert('Deleted', 'Timetable entry removed.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setTtDeletingId('');
    }
  };

  const confirmDeleteTimetable = (entry) => {
    Alert.alert(
      'Delete Timetable',
      `Delete ${getTimetableEntryTitle(entry)} on ${entry.dayOfWeek}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTimetableEntry(entry._id),
        },
      ],
    );
  };

  const reviewRegistration = async (requestId, decision) => {
    if (reviewingRequestId) return;

    const reason = decision === 'reject'
      ? 'Rejected by admin. Contact support for review details.'
      : '';

    setReviewingRequestId(requestId);
    try {
      await request(`/api/users/${requestId}/registration-review`, {
        method: 'PATCH',
        token,
        body: { decision, reason },
      });
      await loadAll();
      Alert.alert(
        'Success',
        decision === 'approve' ? 'Registration approved.' : 'Registration rejected.',
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setReviewingRequestId('');
    }
  };

  const updateAdminProfile = async () => {
    const name = profileName.trim();
    const email = profileEmail.trim();

    if (!name || !email) {
      Alert.alert('Missing Fields', 'Name and email are required.');
      return;
    }

    setProfileSaving(true);
    try {
      const data = await request('/api/auth/profile', {
        method: 'PUT',
        token,
        body: { name, email },
      });
      onUserUpdated(data.user);
      setProfileName(data.user.name || '');
      setProfileEmail(data.user.email || '');
      Alert.alert('Updated', data.message || 'Admin profile updated successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const submitAdminSuggestion = async () => {
    const title = adminSuggestionTitle.trim();
    const message = adminSuggestionMessage.trim();

    if (!title || !message) {
      Alert.alert('Missing Fields', 'Title and message are required.');
      return;
    }

    setSubmittingAdminSuggestion(true);
    try {
      await request('/api/suggestions', {
        method: 'POST',
        token,
        body: {
          title,
          message,
          type: 'Suggestion',
        },
      });
      setAdminSuggestionTitle('');
      setAdminSuggestionMessage('');
      await loadAll();
      Alert.alert('Submitted', 'Your suggestion has been saved.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingAdminSuggestion(false);
    }
  };

  const beginSuggestionReview = (suggestion) => {
    setSelectedSuggestionId(suggestion._id);
    setSuggestionReviewStatus(suggestion.status || 'Open');
    setSuggestionReply(suggestion.reply || '');
    setSuggestionAdminNote(suggestion.adminNote || '');
  };

  const saveSuggestionReview = async () => {
    if (!selectedSuggestionId) {
      Alert.alert('Select Suggestion', 'Choose a suggestion to review first.');
      return;
    }

    setSavingSuggestionReview(true);
    try {
      await request(`/api/suggestions/${selectedSuggestionId}`, {
        method: 'PATCH',
        token,
        body: {
          status: suggestionReviewStatus,
          reply: suggestionReply,
          adminNote: suggestionAdminNote,
        },
      });
      await loadAll();
      Alert.alert('Updated', 'Suggestion review saved successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingSuggestionReview(false);
    }
  };

  const beginLeaveRequestReview = (leaveRequest) => {
    setSelectedLeaveRequestId(leaveRequest._id);
    setLeaveReviewStatus(leaveRequest.status || 'Pending');
    setLeaveAdminReply(leaveRequest.adminReply || '');
  };

  const saveLeaveRequestReview = async () => {
    if (!selectedLeaveRequestId) {
      Alert.alert('Select Request', 'Choose a leave request to review first.');
      return;
    }

    setSavingLeaveReview(true);
    try {
      await request(`/api/leave-requests/${selectedLeaveRequestId}`, {
        method: 'PATCH',
        token,
        body: {
          status: leaveReviewStatus,
          adminReply: leaveAdminReply,
        },
      });
      await loadAll();
      Alert.alert('Updated', 'Leave request review saved successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingLeaveReview(false);
    }
  };

  const adminMenuItems = [
    { key: 'overview', label: 'Dashboard' },
    { key: 'approvals', label: 'Pending Users' },
    { key: 'students', label: 'Students' },
    { key: 'courses', label: 'Class Details' },
    { key: 'timetable', label: 'Timetable' },
    { key: 'leaveRequests', label: 'Leave Requests' },
    { key: 'studentPayments', label: 'Student Payment Details' },
    { key: 'salaryDetails', label: 'Salary Details' },
    { key: 'examResults', label: 'Exams & Results' },
    { key: 'allSuggestions', label: 'All Suggestions' },
    { key: 'mySuggestion', label: 'My Suggestion' },
  ];
  const studentPendingRequests = pendingRequests.filter((req) => (req.requestedRole || 'student') !== 'teacher');
  const tutorPendingRequests = pendingRequests.filter((req) => (req.requestedRole || 'student') === 'teacher');
  const filteredPendingRequests = approvalView === 'teacher' ? tutorPendingRequests : studentPendingRequests;
  const filteredCourses = courseFilterGrade === ALL_GRADES_FILTER
    ? courses
    : courses.filter((course) => course.grade === courseFilterGrade);
  const timetableCoursesForGrade = ttGrade
    ? courses.filter((course) => course.grade === ttGrade)
    : [];
  const timetableTutorsForSubject = tutors.filter((tutor) => (
    String(tutor.subject || '').trim().toLowerCase() === String(ttSubject || '').trim().toLowerCase()
  ));
  const selectedTtTimeSlot = TIMETABLE_TIME_SLOTS.find((slot) => slot.start === ttStart && slot.end === ttEnd) || null;
  const timetableEndOptions = selectedTtTimeSlot ? [selectedTtTimeSlot] : [];
  const selectedTtCourse = courses.find((course) => course._id === ttCourseId) || null;
  const getTimetableEntryTitle = (entry) => formatTimetableEntryTitle(entry, courses);
  const selectedExamDate = selectedExamTerm === 'Term 1'
    ? '2026-03-15'
    : selectedExamTerm === 'Term 2'
      ? '2026-07-15'
      : '2026-11-15';
  const adminMySuggestions = adminSuggestions.filter((item) => (
    String(item.createdBy?._id || item.createdBy?.id || item.createdBy || '') === String(user.id || user._id || '')
  ));
  const selectedSuggestion = adminSuggestions.find((item) => item._id === selectedSuggestionId) || null;
  const selectedLeaveRequest = leaveRequests.find((item) => item._id === selectedLeaveRequestId) || null;
  const pendingLeaveRequests = leaveRequests.filter((item) => item.status === 'Pending');
  const resolvedLeaveRequests = leaveRequests.filter((item) => item.status !== 'Pending');
  const totalMonthlyIncome = courses.reduce((sum, course) => sum + (Number(course.fee) || 0), 0);
  const activeUsers = stats.students + stats.pendingApprovals;

  return (
    <WebDashboardShell
      welcome="Welcome, System Admin!"
      roleLabel="System Admin"
      user={user}
      activeTab={tab}
      onTabChange={setTab}
      menuItems={adminMenuItems}
      onLogout={onLogout}
      onOpenProfile={() => setTab('profile')}
    >
      {/* Header */}
      <View style={{ display: 'none' }}>
        <View>
          <Text style={adm.headerRole}>🛠 Admin Panel</Text>
          <Text style={adm.headerName}>Hello, {user.name.split(' ')[0]}</Text>
        </View>
        <TouchableOpacity
          style={adm.logoutBtn}
          onPress={onLogout}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Text style={adm.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={{ display: 'none' }}>
        {['overview', 'students', 'courses', 'timetable', 'approvals'].map((t) => (
          <TouchableOpacity key={t} style={[adm.tabBtn, tab === t && adm.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[adm.tabBtnText, tab === t && adm.tabBtnTextActive]}>
              {t === 'overview'
                ? '📊 Overview'
                : t === 'students'
                  ? '👥 Students'
                  : t === 'courses'
                    ? '📚 Courses'
                    : t === 'halls'
                      ? 'Halls'
                    : t === 'timetable'
                      ? '🗓 Timetable'
                      : '⏳ Approvals'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={adm.scroll}>
        {loading && <ActivityIndicator color="#7c3aed" style={{ marginTop: 20 }} />}

        {!loading && tab === 'overview' && (
          <>
            <WebPageTitle
              title="Admin Dashboard"
              subtitle="Track the institution overview, fee status, class activity, and user growth from one place."
            />
            <View style={webDash.metricGrid}>
              <WebMetricCard label="Total Students" value={stats.students} badge="ST" accent="#2563eb" />
              <WebMetricCard label="Total Tutors" value={stats.courses} badge="TU" accent="#22c55e" />
              <WebMetricCard label="Total Monthly Income" value={`LKR ${totalMonthlyIncome.toLocaleString()}`} badge="RS" accent="#7c3aed" />
              <WebMetricCard label="Pending Payments" value={stats.pendingApprovals} badge="PD" accent="#f59e0b" />
              <WebMetricCard label="Total Active Users" value={activeUsers} badge="AC" accent="#0f766e" />
              <WebMetricCard label="All Class Attendance" value={timetable.length} badge="AT" accent="#0f172a" />
            </View>
            <View style={adm.statsRow}>
              <StatCard icon="👥" number={stats.students} label="Students" color="#7c3aed" />
              <StatCard icon="📚" number={stats.courses} label="Courses" color="#0ea5e9" />
              <StatCard icon="📋" number={stats.enrollments} label="Enrollments" color="#f59e0b" />
            </View>

            <View style={adm.card}>
              <SectionHeader title={`Pending Registrations (${stats.pendingApprovals})`} action={loadAll} />
              {pendingRequests.length === 0
                ? <Text style={adm.empty}>No pending approvals.</Text>
                : pendingRequests.slice(0, 4).map((req) => (
                  <View key={req._id} style={adm.listRow}>
                    <View style={adm.avatar}>
                      <Text style={adm.avatarText}>{req.name?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={adm.rowName}>{req.name}</Text>
                      <Text style={adm.rowSub}>{req.email}</Text>
                    </View>
                    <View style={adm.requestRolePill}>
                      <Text style={adm.requestRolePillText}>
                        {(req.requestedRole || 'student') === 'teacher' ? 'Tutor' : 'Student'}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>

            <View style={adm.card}>
              <SectionHeader title="Recent Students" action={loadAll} />
              {students.slice(0, 5).map((s) => (
                <View key={s._id} style={adm.listRow}>
                  <View style={adm.avatar}>
                    <Text style={adm.avatarText}>{s.firstName?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={adm.rowName}>{s.firstName} {s.lastName}</Text>
                    <Text style={adm.rowSub}>{s.email}</Text>
                  </View>
                  <View style={[adm.statusPill, s.status === 'active' ? adm.pillGreen : adm.pillGray]}>
                    <Text style={adm.pillText}>{s.status}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={adm.card}>
              <SectionHeader title="Recent Courses" />
              {courses.slice(0, 5).map((c) => (
                <View key={c._id} style={adm.listRow}>
                  <View style={adm.codeBox}>
                    <Text style={adm.codeText}>{c.code?.slice(0, 3)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={adm.rowName}>{c.name}</Text>
                    {c.grade ? <Text style={adm.rowSub}>Grade: {c.grade}</Text> : null}
                    <Text style={adm.rowSub}>
                      {[c.subject, c.hallAllocation ? `Hall ${c.hallAllocation}` : null].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                  <Text style={adm.feeText}>₹{c.fee}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {!loading && tab === 'students' && (
          <View style={adm.card}>
            <SectionHeader title="Add New Student" />
            <Text style={adm.helperText}>
              Use the same student identity details you expect during registration so records stay consistent.
            </Text>
            {[
              {
                label: 'Full Name',
                val: studentFullName,
                set: setStudentFullName,
                ph: 'Enter full name',
                cap: 'words',
              },
              {
                label: 'Email Address',
                val: sEmail,
                set: setSEmail,
                ph: 'Enter email address',
                kb: 'email-address',
                cap: 'none',
              },
              {
                label: 'Contact No',
                val: sPhone,
                set: setSPhone,
                ph: 'Enter contact number',
                kb: 'phone-pad',
                cap: 'none',
              },
            ].map(({ label, val, set, ph, kb, cap }) => (
              <View key={label} style={adm.formField}>
                <Text style={adm.formLabel}>{label}</Text>
                <TextInput
                  style={[adm.input, adm.formInput]}
                  placeholder={ph}
                  value={val}
                  onChangeText={set}
                  keyboardType={kb || 'default'}
                  autoCapitalize={cap || 'none'}
                  autoCorrect={false}
                  showSoftInputOnFocus
                  placeholderTextColor="#94a3b8"
                />
              </View>
            ))}
            <TouchableOpacity style={adm.actionBtn} onPress={addStudent} disabled={creating}>
              <Text style={adm.actionBtnText}>{creating ? 'Adding...' : '+ Add Student'}</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 20 }}>
              <SectionHeader title={`All Students (${students.length})`} action={loadAll} />
              {students.length === 0
                ? <Text style={adm.empty}>No students yet.</Text>
                : students.map((s) => (
                  <View key={s._id} style={adm.listRow}>
                    <View style={adm.avatar}>
                      <Text style={adm.avatarText}>{s.firstName?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={adm.rowName}>{s.firstName} {s.lastName}</Text>
                      <Text style={adm.rowSub}>{s.email}</Text>
                    </View>
                    <View style={[adm.statusPill, s.status === 'active' ? adm.pillGreen : adm.pillGray]}>
                      <Text style={adm.pillText}>{s.status}</Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}

        {!loading && tab === 'courses' && (
          <View style={adm.card}>
            <SectionHeader title="Manage Courses" />
            <TextInput
              style={adm.input}
              placeholder="Subject"
              value={cSubject}
              onChangeText={setCSubject}
              autoCapitalize="none"
              showSoftInputOnFocus
              placeholderTextColor="#94a3b8"
            />
            <View style={adm.formField}>
              <Text style={adm.formLabel}>Grade</Text>
              <TouchableOpacity
                style={adm.selectField}
                onPress={() => {
                  setShowCourseFilterOptions(false);
                  setShowGradeOptions((current) => !current);
                }}
              >
                <Text style={cGrade ? adm.selectFieldText : adm.selectFieldPlaceholder}>
                  {cGrade || 'Select grade'}
                </Text>
                <Text style={adm.selectFieldArrow}>{showGradeOptions ? '^' : 'v'}</Text>
              </TouchableOpacity>
              {showGradeOptions ? (
                <View style={adm.selectOptions}>
                  {COURSE_GRADE_OPTIONS.map((grade) => (
                    <TouchableOpacity
                      key={grade}
                      style={[adm.selectOption, cGrade === grade && adm.selectOptionActive]}
                      onPress={() => {
                        setCGrade(grade);
                        setShowGradeOptions(false);
                      }}
                    >
                      <Text style={[adm.selectOptionText, cGrade === grade && adm.selectOptionTextActive]}>
                        {grade}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
            <TextInput
              style={adm.input}
              placeholder="Fee (₹)"
              value={cFee}
              onChangeText={setCFee}
              keyboardType="numeric"
              autoCapitalize="none"
              showSoftInputOnFocus
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity style={adm.actionBtn} onPress={addCourse} disabled={creatingCourse}>
              <Text style={adm.actionBtnText}>
                {creatingCourse ? 'Adding...' : '+ Add Course'}
              </Text>
            </TouchableOpacity>

            <View style={{ marginTop: 20 }}>
              <SectionHeader title={`All Courses (${filteredCourses.length})`} action={loadAll} />
              <View style={adm.formField}>
                <Text style={adm.formLabel}>View By Grade</Text>
                <TouchableOpacity
                  style={adm.selectField}
                  onPress={() => {
                    setShowGradeOptions(false);
                    setShowCourseFilterOptions((current) => !current);
                  }}
                >
                  <Text style={adm.selectFieldText}>{courseFilterGrade}</Text>
                  <Text style={adm.selectFieldArrow}>{showCourseFilterOptions ? '^' : 'v'}</Text>
                </TouchableOpacity>
                {showCourseFilterOptions ? (
                  <View style={adm.selectOptions}>
                    {[ALL_GRADES_FILTER, ...COURSE_GRADE_OPTIONS].map((grade) => (
                      <TouchableOpacity
                        key={grade}
                        style={[adm.selectOption, courseFilterGrade === grade && adm.selectOptionActive]}
                        onPress={() => {
                          setCourseFilterGrade(grade);
                          setShowCourseFilterOptions(false);
                        }}
                      >
                        <Text style={[adm.selectOptionText, courseFilterGrade === grade && adm.selectOptionTextActive]}>
                          {grade}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
              {filteredCourses.length === 0
                ? (
                  <Text style={adm.empty}>
                    {courseFilterGrade === ALL_GRADES_FILTER
                      ? 'No courses yet.'
                      : `No courses found for ${courseFilterGrade}.`}
                  </Text>
                )
                : filteredCourses.map((c) => (
                  <View key={c._id} style={adm.listRow}>
                    <View style={adm.codeBox}>
                      <Text style={adm.codeText}>{c.code?.slice(0, 3)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={adm.rowName}>{c.name}</Text>
                      <Text style={adm.rowSub}>{[c.subject, c.grade, c.status].filter(Boolean).join(' • ')}</Text>
                    </View>
                    <Text style={adm.feeText}>₹{c.fee}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {!loading && tab === 'timetable' && (
          <View style={adm.card}>
            <SectionHeader title={ttEditingId ? 'Edit Timetable Entry' : 'Add Timetable Entry'} action={loadAll} />

            <View style={adm.formField}>
              <Text style={adm.formLabel}>Grade</Text>
              <TouchableOpacity
                style={adm.selectField}
                onPress={() => {
                  setShowTtCourseOptions(false);
                  setShowTtGradeOptions((current) => !current);
                }}
              >
                <Text style={ttGrade ? adm.selectFieldText : adm.selectFieldPlaceholder}>
                  {ttGrade || 'Select grade'}
                </Text>
                <Text style={adm.selectFieldArrow}>{showTtGradeOptions ? '^' : 'v'}</Text>
              </TouchableOpacity>
              {showTtGradeOptions ? (
                <View style={adm.selectOptions}>
                  {COURSE_GRADE_OPTIONS.map((grade) => (
                    <TouchableOpacity
                      key={grade}
                      style={[adm.selectOption, ttGrade === grade && adm.selectOptionActive]}
                      onPress={() => selectTimetableGrade(grade)}
                    >
                      <Text style={[adm.selectOptionText, ttGrade === grade && adm.selectOptionTextActive]}>
                        {grade}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={adm.formField}>
              <Text style={adm.formLabel}>Subject</Text>
              <TouchableOpacity
                style={adm.selectField}
                onPress={() => {
                  if (!ttGrade) return;
                  setShowTtGradeOptions(false);
                  setShowTtTutorOptions(false);
                  setShowTtCourseOptions((current) => !current);
                }}
              >
                <Text style={ttCourseId ? adm.selectFieldText : adm.selectFieldPlaceholder}>
                  {ttCourseId
                    ? (selectedTtCourse?.subject || selectedTtCourse?.name || '')
                    : (ttGrade ? 'Select subject' : 'Select grade first')}
                </Text>
                <Text style={adm.selectFieldArrow}>{showTtCourseOptions ? '^' : 'v'}</Text>
              </TouchableOpacity>
              {showTtCourseOptions ? (
                <View style={adm.selectOptions}>
                  {timetableCoursesForGrade.length === 0 ? (
                    <Text style={adm.selectEmptyText}>No subjects available for this grade.</Text>
                  ) : timetableCoursesForGrade.map((course) => (
                    <TouchableOpacity
                      key={course._id}
                      style={[adm.selectOption, ttCourseId === course._id && adm.selectOptionActive]}
                      onPress={() => selectTimetableCourse(course)}
                    >
                      <Text style={[adm.selectOptionText, ttCourseId === course._id && adm.selectOptionTextActive]}>
                        {course.subject || course.name || 'Untitled Subject'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={adm.dayPickRow}>
              {TIMETABLE_DAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[adm.dayChip, ttDay === day && adm.dayChipActive]}
                  onPress={() => setTtDay(day)}
                >
                  <Text style={[adm.dayChipText, ttDay === day && adm.dayChipTextActive]}>
                    {day.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={adm.timeRowWrap}>
              <View style={adm.timeInput}>
                <TouchableOpacity
                  style={adm.selectField}
                  onPress={() => {
                    setShowTtEndOptions(false);
                    setShowTtStartOptions((current) => !current);
                  }}
                >
                  <Text style={ttStart ? adm.selectFieldText : adm.selectFieldPlaceholder}>
                    {ttStart ? formatTimetableTime(ttStart) : 'Select start time'}
                  </Text>
                  <Text style={adm.selectFieldArrow}>{showTtStartOptions ? '^' : 'v'}</Text>
                </TouchableOpacity>
                {showTtStartOptions ? (
                  <View style={adm.selectOptions}>
                    {TIMETABLE_TIME_SLOTS.map((slot) => (
                      <TouchableOpacity
                        key={slot.start}
                        style={[adm.selectOption, ttStart === slot.start && ttEnd === slot.end && adm.selectOptionActive]}
                        onPress={() => selectTimetableStartTime(slot)}
                      >
                        <Text style={[adm.selectOptionText, ttStart === slot.start && ttEnd === slot.end && adm.selectOptionTextActive]}>
                          {formatTimetableTime(slot.start)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
              <View style={adm.timeInput}>
                <TouchableOpacity
                  style={adm.selectField}
                  onPress={() => {
                    if (!ttStart) return;
                    setShowTtStartOptions(false);
                    setShowTtEndOptions((current) => !current);
                  }}
                >
                  <Text style={ttEnd ? adm.selectFieldText : adm.selectFieldPlaceholder}>
                    {ttEnd ? formatTimetableTime(ttEnd) : (ttStart ? 'Select end time' : 'Select start first')}
                  </Text>
                  <Text style={adm.selectFieldArrow}>{showTtEndOptions ? '^' : 'v'}</Text>
                </TouchableOpacity>
                {showTtEndOptions ? (
                  <View style={adm.selectOptions}>
                    {timetableEndOptions.map((slot) => (
                      <TouchableOpacity
                        key={`${slot.start}-${slot.end}`}
                        style={[adm.selectOption, ttEnd === slot.end && adm.selectOptionActive]}
                        onPress={() => selectTimetableEndTime(slot)}
                      >
                        <Text style={[adm.selectOptionText, ttEnd === slot.end && adm.selectOptionTextActive]}>
                          {formatTimetableTime(slot.end)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
            <View style={adm.formField}>
              <Text style={adm.formLabel}>Hall</Text>
              <TouchableOpacity
                style={adm.selectField}
                onPress={() => {
                  setShowTtTutorOptions(false);
                  setShowTtHallOptions((current) => !current);
                }}
              >
                <Text style={ttRoom ? adm.selectFieldText : adm.selectFieldPlaceholder}>
                  {ttRoom || 'Select hall'}
                </Text>
                <Text style={adm.selectFieldArrow}>{showTtHallOptions ? '^' : 'v'}</Text>
              </TouchableOpacity>
              {showTtHallOptions ? (
                <View style={adm.selectOptions}>
                  {TIMETABLE_HALL_OPTIONS.map((hall) => (
                    <TouchableOpacity
                      key={hall}
                      style={[adm.selectOption, ttRoom === hall && adm.selectOptionActive]}
                      onPress={() => selectTimetableHall(hall)}
                    >
                      <Text style={[adm.selectOptionText, ttRoom === hall && adm.selectOptionTextActive]}>
                        {hall}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
            <View style={adm.formField}>
              <Text style={adm.formLabel}>Tutor Name</Text>
              <TouchableOpacity
                style={adm.selectField}
                onPress={() => {
                  if (!ttSubject) return;
                  setShowTtHallOptions(false);
                  setShowTtTutorOptions((current) => !current);
                }}
              >
                <Text style={ttTutor ? adm.selectFieldText : adm.selectFieldPlaceholder}>
                  {ttTutor || (ttSubject ? 'Select tutor name' : 'Select subject first')}
                </Text>
                <Text style={adm.selectFieldArrow}>{showTtTutorOptions ? '^' : 'v'}</Text>
              </TouchableOpacity>
              {showTtTutorOptions ? (
                <View style={adm.selectOptions}>
                  {timetableTutorsForSubject.length === 0 ? (
                    <Text style={adm.selectEmptyText}>No tutors registered for this subject.</Text>
                  ) : timetableTutorsForSubject.map((tutor) => (
                    <TouchableOpacity
                      key={tutor._id}
                      style={[adm.selectOption, ttTutor === tutor.name && adm.selectOptionActive]}
                      onPress={() => selectTimetableTutor(tutor.name)}
                    >
                      <Text style={[adm.selectOptionText, ttTutor === tutor.name && adm.selectOptionTextActive]}>
                        {tutor.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            <TouchableOpacity style={adm.actionBtn} onPress={saveTimetable} disabled={ttSaving}>
              <Text style={adm.actionBtnText}>
                {ttSaving ? 'Saving...' : (ttEditingId ? 'Update Timetable' : '+ Add Timetable Entry')}
              </Text>
            </TouchableOpacity>
            {ttEditingId ? (
              <TouchableOpacity style={adm.cancelEditBtn} onPress={resetTimetableForm} disabled={ttSaving}>
                <Text style={adm.cancelEditBtnText}>Cancel Edit</Text>
              </TouchableOpacity>
            ) : null}

            <View style={{ marginTop: 20 }}>
              <SectionHeader title={`Timetable Entries (${timetable.length})`} action={loadAll} />
              {timetable.length === 0
                ? <Text style={adm.empty}>No timetable entries yet.</Text>
                : timetable.map((entry) => (
                  <View key={entry._id} style={adm.ttRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={adm.rowName}>{getTimetableEntryTitle(entry)}</Text>
                      <Text style={adm.rowSub}>
                        {entry.dayOfWeek} • {entry.startTime} - {entry.endTime}
                      </Text>
                      <Text style={adm.ttMeta}>
                        {[entry.subject, entry.room, entry.tutorName].filter(Boolean).join(' • ') || 'No extra details'}
                      </Text>
                    </View>
                    <View style={adm.ttActions}>
                      <TouchableOpacity style={adm.ttEditBtn} onPress={() => beginTimetableEdit(entry)}>
                        <Text style={adm.ttEditBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[adm.ttDeleteBtn, ttDeletingId === entry._id && adm.actionBtnDisabled]}
                        onPress={() => confirmDeleteTimetable(entry)}
                        disabled={ttDeletingId === entry._id}
                      >
                        <Text style={adm.ttDeleteBtnText}>
                          {ttDeletingId === entry._id ? '...' : 'Delete'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}

        {!loading && tab === 'approvals' && (
          <View style={adm.card}>
            <SectionHeader title={`Registration Requests (${filteredPendingRequests.length})`} action={loadAll} />
            <View style={adm.manageSwitchRow}>
              <TouchableOpacity
                style={[adm.manageSwitchBtn, approvalView === 'student' && adm.manageSwitchBtnActive]}
                onPress={() => setApprovalView('student')}
              >
                <Text style={[adm.manageSwitchText, approvalView === 'student' && adm.manageSwitchTextActive]}>
                  Students ({studentPendingRequests.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[adm.manageSwitchBtn, approvalView === 'teacher' && adm.manageSwitchBtnActive]}
                onPress={() => setApprovalView('teacher')}
              >
                <Text style={[adm.manageSwitchText, approvalView === 'teacher' && adm.manageSwitchTextActive]}>
                  Tutors ({tutorPendingRequests.length})
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={adm.helperText}>
              View and review student and tutor registration requests separately.
            </Text>
            {filteredPendingRequests.length === 0
              ? <Text style={adm.empty}>No pending {approvalView === 'teacher' ? 'tutor' : 'student'} registration requests.</Text>
              : filteredPendingRequests.map((req) => (
                <View key={req._id} style={adm.approvalRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={adm.rowName}>{req.name}</Text>
                    <Text style={adm.rowSub}>{req.email}</Text>
                    <Text style={adm.requestMeta}>
                      Requested role: {(req.requestedRole || 'student') === 'teacher' ? 'Tutor' : 'Student'}
                    </Text>
                  </View>
                  <View style={adm.approvalActions}>
                    <TouchableOpacity
                      style={[adm.approveBtn, reviewingRequestId === req._id && adm.actionBtnDisabled]}
                      onPress={() => reviewRegistration(req._id, 'approve')}
                      disabled={reviewingRequestId === req._id}
                    >
                      <Text style={adm.approveBtnText}>
                        {reviewingRequestId === req._id ? '...' : 'Approve'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[adm.rejectBtn, reviewingRequestId === req._id && adm.actionBtnDisabled]}
                      onPress={() => reviewRegistration(req._id, 'reject')}
                      disabled={reviewingRequestId === req._id}
                    >
                      <Text style={adm.rejectBtnText}>
                        {reviewingRequestId === req._id ? '...' : 'Reject'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </View>
        )}

        {!loading && tab === 'leaveRequests' && (
          <>
            <WebPageTitle
              title="Leave Requests"
              subtitle="Review tutor leave submissions, record decisions, and keep reply notes visible."
            />
            <View style={webDash.metricGrid}>
              <WebMetricCard label="Total Requests" value={String(leaveRequests.length)} accent="#2563eb" />
              <WebMetricCard label="Pending" value={String(pendingLeaveRequests.length)} accent="#f59e0b" />
              <WebMetricCard label="Resolved" value={String(resolvedLeaveRequests.length)} accent="#16a34a" />
            </View>
            {leaveRequests.length === 0 ? (
              <View style={webDash.emptyBox}><Text style={webDash.emptyText}>No leave requests submitted yet.</Text></View>
            ) : (
              <>
                <View style={[webDash.table, { marginTop: 18 }]}>
                  <View style={[webDash.tableRow, webDash.tableHeader]}>
                    {['Tutor Name', 'Subject', 'Leave Date', 'Reason', 'Status', 'Admin Reply', 'Actions'].map((h) => (
                      <View key={h} style={webDash.tableCell}><Text style={webDash.tableHeadText}>{h}</Text></View>
                    ))}
                  </View>
                  {leaveRequests.map((item) => (
                    <View key={item._id} style={webDash.tableRow}>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.createdBy?.name || 'Tutor'}</Text></View>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.createdBy?.subject || '-'}</Text></View>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.leaveDate}</Text></View>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.reason}</Text></View>
                      <View style={webDash.tableCell}>
                        <StatusPill
                          label={item.status}
                          tone={item.status === 'Approved' ? 'green' : item.status === 'Rejected' ? 'red' : 'yellow'}
                        />
                      </View>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.adminReply || '-'}</Text></View>
                      <View style={webDash.tableCell}>
                        <TouchableOpacity style={webDash.buttonBlue} onPress={() => beginLeaveRequestReview(item)}>
                          <Text style={webDash.buttonTextLight}>Review</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={webDash.sectionCard}>
                  <Text style={webDash.sectionTitle}>Review Leave Request</Text>
                  {!selectedLeaveRequest ? (
                    <Text style={webDash.sectionText}>Choose a leave request from the table to approve, reject, or send a reply.</Text>
                  ) : (
                    <>
                      <Text style={webDash.sectionText}>
                        {`Selected: ${selectedLeaveRequest.createdBy?.name || 'Tutor'} • ${selectedLeaveRequest.leaveDate}`}
                      </Text>
                      <Text style={[webDash.filterLabel, { marginTop: 14 }]}>Status</Text>
                      <View style={webDash.segmentRow}>
                        {LEAVE_REQUEST_STATUS_OPTIONS.map((status) => (
                          <TouchableOpacity
                            key={status}
                            style={[webDash.segmentButton, leaveReviewStatus === status && webDash.segmentButtonActive]}
                            onPress={() => setLeaveReviewStatus(status)}
                          >
                            <Text style={[webDash.segmentText, leaveReviewStatus === status && webDash.segmentTextActive]}>
                              {status}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={webDash.filterLabel}>Admin Reply</Text>
                      <TextInput
                        style={[webDash.formInput, webDash.textArea]}
                        value={leaveAdminReply}
                        onChangeText={setLeaveAdminReply}
                        placeholder="Write a reply for the tutor"
                        placeholderTextColor="#94a3b8"
                        multiline
                      />
                      <TouchableOpacity
                        style={[webDash.buttonGreen, { marginTop: 18 }]}
                        onPress={saveLeaveRequestReview}
                        disabled={savingLeaveReview}
                      >
                        <Text style={webDash.buttonTextLight}>{savingLeaveReview ? 'Saving...' : 'Save Review'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </>
        )}

        {!loading && tab === 'studentPayments' && (
          <>
            <WebPageTitle
              title="Student Payment Details"
              subtitle="Review all student fee payment records, receipts, and statuses in one place."
            />
            <View style={webDash.filterBar}>
              <View style={webDash.filterField}>
                <Text style={webDash.filterLabel}>Filter By Grade</Text>
                <View style={webDash.selectBox}><Text style={webDash.selectText}>All Grades</Text></View>
              </View>
              <View style={webDash.filterField}>
                <Text style={webDash.filterLabel}>Students Shown</Text>
                <View style={webDash.selectBox}><Text style={webDash.selectText}>{students.length || 4}</Text></View>
              </View>
            </View>
            <View style={webDash.table}>
              <View style={[webDash.tableRow, webDash.tableHeader]}>
                {['Payment ID', 'Student Name', 'Grade', 'Month', 'Amount', 'Receipt', 'Status', 'Created At'].map((h) => (
                  <View key={h} style={webDash.tableCell}><Text style={webDash.tableHeadText}>{h}</Text></View>
                ))}
              </View>
              {(students.length ? students.slice(0, 4) : [{ firstName: 'Student', lastName: '' }]).map((student, index) => (
                <View key={student._id || index} style={webDash.tableRow}>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>{index + 1}</Text></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>{student.firstName} {student.lastName}</Text></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>Grade {6 + index}</Text></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>March 2026</Text></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>LKR 3,500</Text></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>View Receipt</Text></View>
                  <View style={webDash.tableCell}><StatusPill label={index === 0 ? 'Pending' : 'Paid'} tone={index === 0 ? 'green' : 'pink'} /></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>4/6/2026</Text></View>
                </View>
              ))}
            </View>
          </>
        )}

        {!loading && tab === 'salaryDetails' && (
          <>
            <WebPageTitle
              title="Salary Details"
              subtitle="Review monthly tutor salary summaries with hours, rate, and payment status."
            />
            <View style={webDash.filterBar}>
              {['Month: April', 'Year: 2026', `Tutors Shown: ${courses.length || 18}`].map((item) => (
                <View key={item} style={webDash.filterField}>
                  <Text style={webDash.filterLabel}>{item.split(':')[0]}</Text>
                  <View style={webDash.selectBox}><Text style={webDash.selectText}>{item.split(': ')[1]}</Text></View>
                </View>
              ))}
            </View>
            <View style={webDash.table}>
              <View style={[webDash.tableRow, webDash.tableHeader]}>
                {['Tutor Name', 'Subject', 'Month', 'Hours', 'Rate / Hour', 'Amount', 'Status'].map((h) => (
                  <View key={h} style={webDash.tableCell}><Text style={webDash.tableHeadText}>{h}</Text></View>
                ))}
              </View>
              {(courses.length ? courses.slice(0, 6) : [{ name: 'Geography' }]).map((course, index) => {
                const hours = [12, 12, 4, 8, 12, 6][index] || 8;
                const rate = index === 1 ? 800 : 700;
                return (
                  <View key={course._id || index} style={webDash.tableRow}>
                    <View style={webDash.tableCell}><Text style={webDash.tableText}>{course.tutorName || ['A.Sageepan', 'Hithurshan.S', 'K.Jeyaseelan', 'K.Pirasanth'][index] || 'Tutor'}</Text></View>
                    <View style={webDash.tableCell}><Text style={webDash.tableText}>{course.subject || course.name}</Text></View>
                    <View style={webDash.tableCell}><Text style={webDash.tableText}>2026-04</Text></View>
                    <View style={webDash.tableCell}><Text style={webDash.tableText}>{hours}</Text></View>
                    <View style={webDash.tableCell}><Text style={webDash.tableText}>LKR {rate}</Text></View>
                    <View style={webDash.tableCell}><Text style={webDash.tableText}>LKR {(hours * rate).toLocaleString()}</Text></View>
                    <View style={webDash.tableCell}><StatusPill label="Pending" tone="green" /></View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {!loading && tab === 'examResults' && (
          <>
            <WebPageTitle
              title="Exams & Results"
              subtitle="Manage grade-wise examinations and review live tutor-entered marks by term."
            />
            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Browse Results</Text>
              <View style={webDash.segmentRow}>
                {COURSE_GRADE_OPTIONS.map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    style={[webDash.segmentButton, selectedExamGrade === grade && webDash.segmentButtonActive]}
                    onPress={() => setSelectedExamGrade(grade)}
                  >
                    <Text style={[webDash.segmentText, selectedExamGrade === grade && webDash.segmentTextActive]}>{grade}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={webDash.segmentRow}>
                {EXAM_TERM_OPTIONS.map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={[webDash.segmentButton, selectedExamTerm === term && webDash.segmentButtonActive]}
                    onPress={() => setSelectedExamTerm(term)}
                  >
                    <Text style={[webDash.segmentText, selectedExamTerm === term && webDash.segmentTextActive]}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={[webDash.sectionText, { marginTop: 18 }]}>
              {`Grade: ${selectedExamGrade}   Term: ${selectedExamTerm}   Exam: ${selectedExamGrade} ${selectedExamTerm} Examination   Date: ${selectedExamDate}`}
            </Text>
            <View style={[webDash.table, { marginTop: 14 }]}>
              <View style={[webDash.tableRow, webDash.tableHeader]}>
                {['Student Name', 'Tamil', 'Maths', 'Science', 'ICT', 'Total', 'Average'].map((h) => (
                  <View key={h} style={webDash.tableCell}><Text style={webDash.tableHeadText}>{h}</Text></View>
                ))}
              </View>
              {['A.Danushika', 'Thillai vaasan Uthissun'].map((name, index) => (
                <View key={name} style={webDash.tableRow}>
                  <View style={webDash.tableCellWide}><Text style={webDash.tableText}>{name}</Text></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>-</Text></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>-</Text></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>-</Text></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>{index === 0 ? 96 : 88}</Text></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>{index === 0 ? 96 : 88}</Text></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableText}>{index === 0 ? '8.7' : '8.0'}</Text></View>
                </View>
              ))}
            </View>
          </>
        )}

        {!loading && tab === 'allSuggestions' && (
          <>
            <WebPageTitle
              title="All Suggestions & Complaints"
              subtitle="Track incoming feedback, update statuses, and keep a clear response trail."
            />
            <View style={webDash.filterBar}>
              <View style={webDash.filterField}><Text style={webDash.filterLabel}>Status</Text><View style={webDash.selectBox}><Text style={webDash.selectText}>All</Text></View></View>
              <View style={webDash.filterField}><Text style={webDash.filterLabel}>Items</Text><View style={webDash.selectBox}><Text style={webDash.selectText}>{adminSuggestions.length}</Text></View></View>
            </View>
            {adminSuggestions.length === 0 ? (
              <View style={webDash.emptyBox}><Text style={webDash.emptyText}>No suggestions submitted yet.</Text></View>
            ) : (
              <>
                <View style={webDash.table}>
                  <View style={[webDash.tableRow, webDash.tableHeader]}>
                    {['Type', 'Title', 'Created By', 'Status', 'Reply', 'Created', 'Actions'].map((h) => (
                      <View key={h} style={webDash.tableCell}><Text style={webDash.tableHeadText}>{h}</Text></View>
                    ))}
                  </View>
                  {adminSuggestions.map((item) => (
                    <View key={item._id} style={webDash.tableRow}>
                      <View style={webDash.tableCell}>
                        <StatusPill label={item.type || 'Suggestion'} tone={item.type === 'Complaint' ? 'yellow' : 'blue'} />
                      </View>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.title}</Text></View>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.createdBy?.name || 'Unknown'}</Text></View>
                      <View style={webDash.tableCell}>
                        <StatusPill
                          label={item.status || 'Open'}
                          tone={item.status === 'Resolved' ? 'green' : item.status === 'Closed' ? 'red' : 'blue'}
                        />
                      </View>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.reply || '-'}</Text></View>
                      <View style={webDash.tableCell}><Text style={webDash.tableText}>{formatAppDate(item.createdAt)}</Text></View>
                      <View style={webDash.tableCell}>
                        <TouchableOpacity style={webDash.buttonBlue} onPress={() => beginSuggestionReview(item)}>
                          <Text style={webDash.buttonTextLight}>Review</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={webDash.sectionCard}>
                  <Text style={webDash.sectionTitle}>Review Suggestion</Text>
                  {!selectedSuggestion ? (
                    <Text style={webDash.sectionText}>Choose a suggestion from the table to update its status, admin note, or reply.</Text>
                  ) : (
                    <>
                      <Text style={webDash.sectionText}>
                        {`Selected: ${selectedSuggestion.title} • ${selectedSuggestion.createdBy?.name || 'Unknown'}`}
                      </Text>
                      <Text style={[webDash.filterLabel, { marginTop: 14 }]}>Status</Text>
                      <View style={webDash.segmentRow}>
                        {SUGGESTION_STATUS_OPTIONS.map((status) => (
                          <TouchableOpacity
                            key={status}
                            style={[webDash.segmentButton, suggestionReviewStatus === status && webDash.segmentButtonActive]}
                            onPress={() => setSuggestionReviewStatus(status)}
                          >
                            <Text style={[webDash.segmentText, suggestionReviewStatus === status && webDash.segmentTextActive]}>
                              {status}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={webDash.filterLabel}>Admin Note</Text>
                      <TextInput
                        style={[webDash.formInput, webDash.textArea]}
                        value={suggestionAdminNote}
                        onChangeText={setSuggestionAdminNote}
                        placeholder="Write an internal admin note"
                        placeholderTextColor="#94a3b8"
                        multiline
                      />
                      <Text style={[webDash.filterLabel, { marginTop: 14 }]}>Reply</Text>
                      <TextInput
                        style={[webDash.formInput, webDash.textArea]}
                        value={suggestionReply}
                        onChangeText={setSuggestionReply}
                        placeholder="Write a reply for the submitter"
                        placeholderTextColor="#94a3b8"
                        multiline
                      />
                      <TouchableOpacity
                        style={[webDash.buttonGreen, { marginTop: 18 }]}
                        onPress={saveSuggestionReview}
                        disabled={savingSuggestionReview}
                      >
                        <Text style={webDash.buttonTextLight}>{savingSuggestionReview ? 'Saving...' : 'Save Review'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </>
        )}

        {!loading && tab === 'mySuggestion' && (
          <>
            <WebPageTitle title="My Suggestion" subtitle="Create and review your own suggestions or complaints." />
            <View style={webDash.twoColumn}>
              <View style={webDash.halfPanel}>
                <Text style={webDash.sectionTitle}>New Suggestion</Text>
                <TextInput
                  style={webDash.formInput}
                  placeholder="Title"
                  value={adminSuggestionTitle}
                  onChangeText={setAdminSuggestionTitle}
                  placeholderTextColor="#94a3b8"
                />
                <TextInput
                  style={[webDash.formInput, webDash.textArea]}
                  placeholder="Write your message"
                  value={adminSuggestionMessage}
                  onChangeText={setAdminSuggestionMessage}
                  placeholderTextColor="#94a3b8"
                  multiline
                />
                <TouchableOpacity
                  style={[webDash.buttonGreen, { marginTop: 14 }]}
                  onPress={submitAdminSuggestion}
                  disabled={submittingAdminSuggestion}
                >
                  <Text style={webDash.buttonTextLight}>{submittingAdminSuggestion ? 'Submitting...' : 'Submit'}</Text>
                </TouchableOpacity>
              </View>
              <View style={webDash.halfPanel}>
                <Text style={webDash.sectionTitle}>My Recent Items</Text>
                {adminMySuggestions.length === 0 ? (
                  <View style={webDash.emptyBox}><Text style={webDash.emptyText}>No submitted suggestions yet.</Text></View>
                ) : adminMySuggestions.slice(0, 6).map((item) => (
                  <View key={item._id} style={[webDash.tableRow, { borderTopWidth: 1, borderTopColor: '#eef2ff' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[webDash.tableText, { fontWeight: '800' }]}>{item.title}</Text>
                      <Text style={webDash.tableText}>{item.message}</Text>
                      <Text style={webDash.sectionText}>{`${item.status || 'Open'} • ${formatAppDate(item.createdAt)}`}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {!loading && tab === 'profile' && (
          <View style={adm.card}>
            <SectionHeader title="Admin Profile" />
            <View style={[adm.avatar, { width: 70, height: 70, borderRadius: 35, alignSelf: 'center', marginBottom: 14 }]}>
              <Text style={[adm.avatarText, { fontSize: 22 }]}>
                {(user.name || 'A').split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <Text style={[adm.formLabel, { textAlign: 'center', marginBottom: 14 }]}>ADMIN ACCOUNT</Text>
            <View style={adm.formField}>
              <Text style={adm.formLabel}>Full Name</Text>
              <TextInput
                style={[adm.input, adm.formInput]}
                placeholder="Full name"
                value={profileName}
                onChangeText={setProfileName}
                showSoftInputOnFocus
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={adm.formField}>
              <Text style={adm.formLabel}>Email</Text>
              <TextInput
                style={[adm.input, adm.formInput]}
                placeholder="Email"
                value={profileEmail}
                onChangeText={setProfileEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                showSoftInputOnFocus
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={[adm.card, { backgroundColor: '#f8fafc', marginBottom: 0 }]}>
              <Text style={adm.formLabel}>Role</Text>
              <Text style={adm.rowName}>Admin</Text>
              <Text style={[adm.formLabel, { marginTop: 12 }]}>Status</Text>
              <Text style={adm.rowName}>{user.approvalStatus || 'approved'}</Text>
            </View>
            <TouchableOpacity
              style={[adm.actionBtn, profileSaving && adm.actionBtnDisabled]}
              onPress={updateAdminProfile}
              disabled={profileSaving}
            >
              <Text style={adm.actionBtnText}>{profileSaving ? 'Saving...' : 'Update Profile'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </WebDashboardShell>
  );
};

const adm = StyleSheet.create({
  header: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRole: { color: '#c4b5fd', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  logoutBtn: { backgroundColor: '#6d28d9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  logoutText: { color: '#ddd6fe', fontWeight: '700', fontSize: 13 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, backgroundColor: '#f8fafc' },
  tabBtnActive: { backgroundColor: '#7c3aed' },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabBtnTextActive: { color: '#fff' },
  scroll: { padding: 14, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#7c3aed', fontWeight: '800', fontSize: 16 },
  codeBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  codeText: { color: '#1d4ed8', fontWeight: '800', fontSize: 13 },
  rowName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  helperText: { fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 18 },
  formField: { marginBottom: 14 },
  formLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  manageSwitchRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  manageSwitchBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d8b4fe',
    backgroundColor: '#faf5ff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  manageSwitchBtnActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#7c3aed',
  },
  manageSwitchText: { color: '#7c3aed', fontWeight: '700', fontSize: 13 },
  manageSwitchTextActive: { color: '#fff' },
  courseCard: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 10 },
  courseRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  courseMeta: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  courseMetaFilled: { color: '#7c3aed' },
  courseMetaEmpty: { color: '#94a3b8' },
  courseActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  hallInput: { marginTop: 12, marginBottom: 0 },
  feeText: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  pillGreen: { backgroundColor: '#dcfce7' },
  pillGray: { backgroundColor: '#f1f5f9' },
  pillText: { fontSize: 10, fontWeight: '700', color: '#15803d' },
  requestRolePill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#ede9fe',
  },
  requestRolePillText: { fontSize: 10, fontWeight: '700', color: '#6d28d9' },
  approvalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestMeta: { fontSize: 11, color: '#7c3aed', marginTop: 4, fontWeight: '600' },
  approvalActions: { flexDirection: 'row', gap: 8 },
  approveBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rejectBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  rejectBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  actionBtnDisabled: { opacity: 0.6 },
  selectField: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldText: { color: '#0f172a', fontSize: 14 },
  selectFieldPlaceholder: { color: '#94a3b8', fontSize: 14 },
  selectFieldArrow: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  selectOptions: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 10,
  },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  selectEmptyText: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  selectOptionActive: { backgroundColor: '#ede9fe' },
  selectOptionText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  selectOptionTextActive: { color: '#6d28d9', fontWeight: '700' },
  dayPickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  dayChipActive: { borderColor: '#7c3aed', backgroundColor: '#ede9fe' },
  dayChipText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  dayChipTextActive: { color: '#6d28d9' },
  timeRowWrap: { flexDirection: 'row', gap: 10 },
  timeInput: { flex: 1 },
  cancelEditBtn: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelEditBtnText: { color: '#475569', fontWeight: '700', fontSize: 13 },
  ttRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 12,
  },
  ttMeta: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  ttActions: { flexDirection: 'row', gap: 8 },
  ttEditBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ttDeleteBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearHallBtn: {
    backgroundColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ttEditBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  ttDeleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  clearHallBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  formInput: { marginBottom: 0 },
  actionBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  hallActionBtn: { flex: 1 },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 12, fontSize: 13 },
});

// ─────────────────────────────────────────────────────────────────────────────
// TUTOR DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const TutorDashboard = ({ token, user, onUserUpdated, onLogout }) => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [profileName, setProfileName] = useState(user.name || '');
  const [profileEmail, setProfileEmail] = useState(user.email || '');
  const [profileSubject, setProfileSubject] = useState(user.subject || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [suggestionType, setSuggestionType] = useState('Suggestion');
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [submittingLeaveRequest, setSubmittingLeaveRequest] = useState(false);

  const [studentFullName, setStudentFullName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sData, cData, eData, tData, suggestionData, leaveRequestData] = await Promise.all([
        request('/api/students', { token }),
        request('/api/courses', { token }),
        request('/api/enrollments', { token }),
        request('/api/timetable', { token }),
        request('/api/suggestions?mine=true', { token }),
        request('/api/leave-requests?mine=true', { token }),
      ]);
      setStudents(sData.students || []);
      setCourses(cData.courses || []);
      setEnrollments(eData.enrollments || []);
      setTimetable(tData.timetable || []);
      setSuggestions(suggestionData.suggestions || []);
      setLeaveRequests(leaveRequestData.leaveRequests || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    setProfileName(user.name || '');
    setProfileEmail(user.email || '');
    setProfileSubject(user.subject || '');
  }, [user.name, user.email, user.subject]);

  const updateTutorProfile = async () => {
    const name = profileName.trim();
    const email = profileEmail.trim();
    const subject = profileSubject.trim();

    if (!name || !email || !subject) {
      Alert.alert('Missing Fields', 'Name, email, and subject are required.');
      return;
    }

    setProfileSaving(true);
    try {
      const data = await request('/api/auth/profile', {
        method: 'PUT',
        token,
        body: { name, email, subject },
      });
      onUserUpdated(data.user);
      setProfileName(data.user.name || '');
      setProfileEmail(data.user.email || '');
      setProfileSubject(data.user.subject || '');
      Alert.alert('Updated', data.message || 'Tutor profile updated successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const submitTutorSuggestion = async () => {
    if (!suggestionTitle.trim() || !suggestionMessage.trim()) {
      Alert.alert('Missing Fields', 'Type, title, and message are required.');
      return;
    }

    setSubmittingSuggestion(true);
    try {
      const data = await request('/api/suggestions', {
        method: 'POST',
        token,
        body: {
          type: suggestionType,
          title: suggestionTitle.trim(),
          message: suggestionMessage.trim(),
        },
      });
      setSuggestions((current) => [data.suggestion, ...current]);
      setSuggestionTitle('');
      setSuggestionMessage('');
      setSuggestionType('Suggestion');
      setTab('mySuggestion');
      Alert.alert('Submitted', 'Your suggestion has been sent for review.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  const submitLeaveRequest = async () => {
    if (!leaveDate.trim() || !leaveReason.trim()) {
      Alert.alert('Missing Fields', 'Leave date and reason are required.');
      return;
    }

    setSubmittingLeaveRequest(true);
    try {
      const data = await request('/api/leave-requests', {
        method: 'POST',
        token,
        body: {
          leaveDate: leaveDate.trim(),
          reason: leaveReason.trim(),
        },
      });
      setLeaveRequests((current) => [data.leaveRequest, ...current]);
      setLeaveDate('');
      setLeaveReason('');
      Alert.alert('Submitted', 'Your leave request has been sent for review.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingLeaveRequest(false);
    }
  };

  const addStudent = async () => {
    const fullName = studentFullName.trim();
    const email = sEmail.trim();
    const phone = sPhone.trim();
    const { firstName, lastName } = splitFullName(fullName);

    if (!fullName || !email || !phone) {
      Alert.alert('Missing Fields', 'Full name, email, and contact number are required.');
      return;
    }
    if (!firstName || !lastName) {
      Alert.alert('Invalid Name', 'Please enter the full name with at least first and last name.');
      return;
    }
    setCreating(true);
    try {
      const data = await request('/api/students', {
        method: 'POST', token,
        body: { firstName, lastName, email, phone, status: 'active' },
      });
      setStudentFullName('');
      setSEmail('');
      setSPhone('');
      await loadAll();
      Alert.alert('✅ Added', 'Student added successfully.');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setCreating(false); }
  };

  const tutorMenuItems = [
    { key: 'overview', label: 'Overview' },
    { key: 'timetable', label: 'My Classes' },
    { key: 'students', label: 'Attendance' },
    { key: 'enrollments', label: 'Salary Summary' },
    { key: 'leaveRequests', label: 'Leave Requests' },
    { key: 'examResults', label: 'Exam & Results' },
    { key: 'mySuggestion', label: 'My Suggestion' },
    { key: 'newSuggestion', label: 'New Suggestion/Complaints' },
    { key: 'profile', label: 'Tutor Profile' },
  ];
  const monthHours = Math.min(60, timetable.length * 2);

  return (
    <WebDashboardShell
      welcome="Welcome, Tutor!"
      roleLabel="Tutor Dashboard"
      user={user}
      activeTab={tab}
      onTabChange={setTab}
      menuItems={tutorMenuItems}
      onLogout={onLogout}
      onOpenProfile={() => setTab('profile')}
    >
      {/* Header */}
      <View style={{ display: 'none' }}>
        <View>
          <Text style={tut.headerRole}>📚 Tutor Dashboard</Text>
          <Text style={tut.headerName}>Mr/Ms. {user.name.split(' ')[0]}</Text>
        </View>
        <TouchableOpacity
          style={tut.logoutBtn}
          onPress={onLogout}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Text style={tut.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Email */}
      <View style={{ display: 'none' }}>
        <Text style={tut.emailText}>✉ {user.email}</Text>
      </View>

      {/* Tabs */}
      <View style={{ display: 'none' }}>
        {['profile', 'overview', 'students', 'enrollments', 'timetable'].map((t) => (
          <TouchableOpacity key={t} style={[tut.tabBtn, tab === t && tut.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[tut.tabText, tab === t && tut.tabTextActive]}>
              {t === 'profile' ? 'Profile' : t === 'overview' ? 'Home' : t === 'students' ? 'Students' : t === 'enrollments' ? 'Enrollments' : 'Timetable'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={tut.scroll}>
        {loading && <ActivityIndicator color="#0ea5e9" style={{ marginTop: 20 }} />}

        {!loading && tab === 'overview' && (
          <>
            <WebPageTitle
              title="Overview"
              subtitle="Review your classes, student reach, hours, and current salary status."
            />
            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Tutor Overview</Text>
              <Text style={webDash.sectionText}>A quick look at today's work, current teaching load, and salary progress.</Text>
              <View style={[webDash.metricGrid, { marginTop: 18 }]}>
                <WebMetricCard label="Classes Today" value={timetable.length} detail="Scheduled active classes for today" accent="#2563eb" />
                <WebMetricCard label="Total Students" value={students.length} detail="Distinct students across assigned classes" accent="#2563eb" />
                <WebMetricCard label="Hours This Month" value={monthHours} detail="60 hour target this month" progress={(monthHours / 60) * 100} accent="#2563eb" />
                <WebMetricCard label="Salary Status" value="Paid" detail="Current month settled" accent="#16a34a" />
              </View>
            </View>
            <View style={tut.statsRow}>
              <StatCard icon="👥" number={students.length} label="My Students" color="#0ea5e9" />
              <StatCard icon="📚" number={courses.length} label="Courses" color="#06b6d4" />
              <StatCard icon="📋" number={enrollments.length} label="Enrollments" color="#8b5cf6" />
            </View>

            <View style={tut.card}>
              <SectionHeader title="My Course List" action={loadAll} />
              {courses.length === 0
                ? <Text style={tut.empty}>No courses available.</Text>
                : courses.map((c) => (
                  <View key={c._id} style={tut.courseRow}>
                    <View style={tut.courseIcon}>
                      <Text style={{ fontSize: 18 }}>📖</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={tut.courseName}>{c.name}</Text>
                      {c.grade ? <Text style={tut.courseHall}>Grade: {c.grade}</Text> : null}
                      {c.hallAllocation ? <Text style={tut.courseHall}>Hall: {c.hallAllocation}</Text> : null}
                      <Text style={tut.courseSub}>{c.code} • {c.subject}</Text>
                    </View>
                    <View>
                      <Text style={tut.courseFee}>₹{c.fee}</Text>
                      <View style={[tut.statusChip, c.status === 'active' ? tut.chipGreen : tut.chipGray]}>
                        <Text style={tut.chipText}>{c.status}</Text>
                      </View>
                    </View>
                  </View>
                ))}
            </View>
          </>
        )}

        {!loading && tab === 'profile' && (
          <View style={tut.card}>
            <SectionHeader title="Tutor Profile" />
            <View style={tut.profileAvatar}>
              <Text style={tut.profileAvatarText}>
                {(user.name || 'T').split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <Text style={tut.profileRole}>TUTOR ACCOUNT</Text>
            <TextInput
              style={tut.input}
              placeholder="Full name"
              value={profileName}
              onChangeText={setProfileName}
              showSoftInputOnFocus
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={tut.input}
              placeholder="Email"
              value={profileEmail}
              onChangeText={setProfileEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              showSoftInputOnFocus
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={tut.input}
              placeholder="Subject"
              value={profileSubject}
              onChangeText={setProfileSubject}
              showSoftInputOnFocus
              placeholderTextColor="#94a3b8"
            />
            <View style={tut.profileInfoBox}>
              <Text style={tut.profileInfoLabel}>Role</Text>
              <Text style={tut.profileInfoValue}>Tutor</Text>
              <Text style={tut.profileInfoLabel}>Subject</Text>
              <Text style={tut.profileInfoValue}>{user.subject || 'Not set'}</Text>
              <Text style={tut.profileInfoLabel}>Status</Text>
              <Text style={tut.profileInfoValue}>{user.approvalStatus || 'approved'}</Text>
            </View>
            <TouchableOpacity
              style={[tut.addBtn, profileSaving && tut.btnDisabled]}
              onPress={updateTutorProfile}
              disabled={profileSaving}
            >
              <Text style={tut.addBtnText}>{profileSaving ? 'Saving...' : 'Update Profile'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && tab === 'students_legacy' && (
          <View style={tut.card}>
            <SectionHeader title="Add Student" />
            <TextInput style={tut.input} placeholder="Full name" value={studentFullName}
              onChangeText={setStudentFullName} showSoftInputOnFocus placeholderTextColor="#94a3b8" />
            <TextInput style={tut.input} placeholder="Email" value={sEmail}
              onChangeText={setSEmail} autoCapitalize="none" keyboardType="email-address"
              showSoftInputOnFocus placeholderTextColor="#94a3b8" />
            <TextInput style={tut.input} placeholder="Contact no" value={sPhone}
              onChangeText={setSPhone} keyboardType="phone-pad"
              showSoftInputOnFocus placeholderTextColor="#94a3b8" />
            <TouchableOpacity style={tut.addBtn} onPress={addStudent} disabled={creating}>
              <Text style={tut.addBtnText}>{creating ? 'Adding...' : '+ Add Student'}</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 16 }}>
              <SectionHeader title={`Students (${students.length})`} action={loadAll} />
              {students.length === 0
                ? <Text style={tut.empty}>No students yet.</Text>
                : students.map((s) => (
                  <View key={s._id} style={tut.studentRow}>
                    <View style={tut.studentAvatar}>
                      <Text style={tut.studentAvatarText}>{s.firstName?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={tut.studentName}>{s.firstName} {s.lastName}</Text>
                      <Text style={tut.studentEmail}>{s.email}</Text>
                    </View>
                    <View style={[tut.statusChip, s.status === 'active' ? tut.chipGreen : tut.chipGray]}>
                      <Text style={tut.chipText}>{s.status}</Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}

        {!loading && tab === 'enrollments_legacy' && (
          <View style={tut.card}>
            <SectionHeader title={`Enrollments (${enrollments.length})`} action={loadAll} />
            {enrollments.length === 0
              ? <Text style={tut.empty}>No enrollments yet.</Text>
              : enrollments.map((e) => (
                <View key={e._id} style={tut.enrollRow}>
                  <View style={tut.enrollIcon}>
                    <Text style={{ fontSize: 18 }}>📋</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={tut.enrollName}>
                      {e.student?.firstName} {e.student?.lastName}
                    </Text>
                    <Text style={tut.enrollSub}>{e.course?.name} • {e.course?.code}</Text>
                  </View>
                  <View style={[tut.statusChip,
                    e.status === 'enrolled' ? tut.chipBlue
                    : e.status === 'completed' ? tut.chipGreen
                    : tut.chipRed]}>
                    <Text style={tut.chipText}>{e.status}</Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {!loading && tab === 'timetable' && (
          <View style={tut.card}>
            <SectionHeader title={`Timetable (${timetable.length})`} action={loadAll} />
            {timetable.length === 0
              ? <Text style={tut.empty}>No timetable available yet.</Text>
              : timetable.map((entry) => (
                <View key={entry._id} style={tut.ttRow}>
                  <View style={tut.ttDayBadge}>
                    <Text style={tut.ttDayText}>{(entry.dayOfWeek || '').slice(0, 3)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={tut.enrollName}>{formatTimetableEntryTitle(entry, courses)}</Text>
                    <Text style={tut.enrollSub}>{entry.startTime} - {entry.endTime}</Text>
                    <Text style={tut.ttMeta}>
                      {[entry.subject, entry.room, entry.tutorName].filter(Boolean).join(' • ') || 'No extra details'}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {!loading && tab === 'students' && (
          <>
            <WebPageTitle
              title="Attendance Marking"
              subtitle="Mark present and absent students for your next upcoming class in one place."
            />
            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Attendance Marking</Text>
              <Text style={webDash.sectionText}>Mark attendance only for your first-hour subject for today and submit once.</Text>
              <View style={[webDash.filterBar, { marginTop: 18 }]}>
                <Text style={[webDash.tableText, { fontWeight: '900' }]}>ICT - Grade 8</Text>
                <Text style={webDash.sectionText}>First hour starts at 15:00</Text>
              </View>
              {(students.length ? students.slice(0, 3) : [{ firstName: 'S.Hithurshan', lastName: '' }]).map((student, index) => (
                <View key={student._id || index} style={[webDash.tableRow, { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginTop: 10 }]}>
                  <View style={[webDash.tableCellSmall, { alignItems: 'center' }]}><View style={adm.avatar}><Text style={adm.avatarText}>{(student.firstName || 'S')[0]}</Text></View></View>
                  <View style={webDash.tableCellWide}><Text style={webDash.tableText}>{student.firstName} {student.lastName}</Text></View>
                  <View style={webDash.tableCell}><View style={webDash.actionRow}><TouchableOpacity style={webDash.buttonGreen}><Text style={webDash.buttonTextLight}>Present</Text></TouchableOpacity><TouchableOpacity style={webDash.buttonSoft}><Text style={webDash.buttonTextBlue}>Absent</Text></TouchableOpacity></View></View>
                </View>
              ))}
              <View style={[webDash.actionRow, { justifyContent: 'space-between', marginTop: 16 }]}>
                <TouchableOpacity style={webDash.buttonSoft}><Text style={webDash.buttonTextBlue}>Mark all present</Text></TouchableOpacity>
                <TouchableOpacity style={webDash.buttonBlue}><Text style={webDash.buttonTextLight}>Submit attendance</Text></TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {!loading && tab === 'enrollments' && (
          <>
            <WebPageTitle
              title="Salary Summary"
              subtitle="Review your working hours, salary calculation, and recent payment history."
            />
            <View style={webDash.sectionCard}>
              <Text style={webDash.sectionTitle}>Salary Summary</Text>
              <Text style={webDash.sectionText}>Review your monthly hours, salary estimate, and latest payment updates.</Text>
              <View style={[webDash.metricGrid, { marginTop: 18 }]}>
                <WebMetricCard label="Hours This Month" value={monthHours || 56} accent="#2563eb" />
                <WebMetricCard label="Rate Per Hour" value="LKR 800" accent="#2563eb" />
                <WebMetricCard label="Base Salary" value={`LKR ${((monthHours || 56) * 800).toLocaleString()}`} accent="#2563eb" />
                <WebMetricCard label="Payment Status" value="Paid" accent="#16a34a" />
              </View>
              <Text style={[webDash.sectionTitle, { marginTop: 20 }]}>Last 3 months</Text>
              <View style={[webDash.table, { marginTop: 12 }]}>
                <View style={webDash.tableRow}>
                  <View style={webDash.tableCellWide}><Text style={webDash.tableText}>March 2026{"\n"}LKR 44,800</Text></View>
                  <View style={webDash.tableCell}><StatusPill label="Paid" tone="green" /></View>
                </View>
              </View>
              <TouchableOpacity style={[webDash.buttonBlue, { alignSelf: 'flex-end', marginTop: 18 }]}><Text style={webDash.buttonTextLight}>Download salary slip</Text></TouchableOpacity>
            </View>
          </>
        )}

        {!loading && tab === 'leaveRequests' && (
          <>
            <WebPageTitle
              title="Leave Requests"
              subtitle="Submit your own leave requests here. Student absence requests remain available below."
            />
            <View style={webDash.twoColumn}>
              <View style={webDash.halfPanel}>
                <Text style={webDash.sectionTitle}>Submit Leave Request</Text>
                <Text style={webDash.sectionText}>Choose a leave date and provide the reason for your absence.</Text>
                <Text style={webDash.filterLabel}>Leave Date</Text>
                <TextInput
                  style={webDash.formInput}
                  placeholder="YYYY-MM-DD"
                  value={leaveDate}
                  onChangeText={setLeaveDate}
                  placeholderTextColor="#94a3b8"
                />
                <Text style={[webDash.filterLabel, { marginTop: 14 }]}>Reason</Text>
                <TextInput
                  style={[webDash.formInput, webDash.textArea]}
                  placeholder="Enter your leave reason"
                  value={leaveReason}
                  onChangeText={setLeaveReason}
                  placeholderTextColor="#94a3b8"
                  multiline
                />
                <TouchableOpacity
                  style={[webDash.buttonGreen, { marginTop: 18 }]}
                  onPress={submitLeaveRequest}
                  disabled={submittingLeaveRequest}
                >
                  <Text style={webDash.buttonTextLight}>{submittingLeaveRequest ? 'Submitting...' : 'Submit Request'}</Text>
                </TouchableOpacity>
              </View>
              <View style={webDash.halfPanel}>
                <Text style={webDash.sectionTitle}>My Leave Requests</Text>
                <Text style={webDash.sectionText}>Review the status of your submitted requests and the admin reply.</Text>
                {leaveRequests.length === 0 ? (
                  <View style={webDash.emptyBox}><Text style={webDash.emptyText}>You have not submitted any leave requests yet.</Text></View>
                ) : (
                  <View style={[webDash.table, { marginTop: 12 }]}>
                    <View style={[webDash.tableRow, webDash.tableHeader]}>
                      {['Leave Date', 'Reason', 'Status', 'Admin Reply'].map((h) => (
                        <View key={h} style={webDash.tableCell}><Text style={webDash.tableHeadText}>{h}</Text></View>
                      ))}
                    </View>
                    {leaveRequests.map((item) => (
                      <View key={item._id} style={webDash.tableRow}>
                        <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.leaveDate}</Text></View>
                        <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.reason}</Text></View>
                        <View style={webDash.tableCell}>
                          <StatusPill
                            label={item.status}
                            tone={item.status === 'Approved' ? 'green' : item.status === 'Rejected' ? 'red' : 'yellow'}
                          />
                        </View>
                        <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.adminReply || '-'}</Text></View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        {!loading && tab === 'examResults' && (
          <>
            <WebPageTitle
              title="Exam & Results Mark Entry"
              subtitle="Click a grade to see all registered students. When an exam exists for the selected term, you can update only your own subject marks."
            />
            <View style={webDash.sectionCard}>
              <StatusPill label="Subject: ICT" tone="blue" />
              <View style={[webDash.segmentRow, { marginTop: 18 }]}>
                {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'].map((grade, index) => (
                  <TouchableOpacity key={grade} style={[webDash.segmentButton, index === 0 && webDash.segmentButtonActive]}>
                    <Text style={[webDash.segmentText, index === 0 && webDash.segmentTextActive]}>{grade}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={webDash.segmentRow}>
                {['Term 1', 'Term 2', 'Term 3'].map((term, index) => (
                  <TouchableOpacity key={term} style={[webDash.segmentButton, index === 0 && webDash.segmentButtonActive]}>
                    <Text style={[webDash.segmentText, index === 0 && webDash.segmentTextActive]}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={webDash.filterLabel}>Select Exam</Text>
              <View style={webDash.selectBox}><Text style={webDash.selectText}>Grade 6 Term 1 Examination (Term 1 - 2026-03-15)</Text></View>
              <View style={[webDash.table, { marginTop: 18 }]}>
                <View style={[webDash.tableRow, webDash.tableHeader]}>
                  <View style={webDash.tableCellWide}><Text style={webDash.tableHeadText}>Student Name</Text></View>
                  <View style={webDash.tableCell}><Text style={webDash.tableHeadText}>ICT</Text></View>
                </View>
                {['A.Danushika', 'Thillai vaasan Uthissun'].map((name, index) => (
                  <View key={name} style={webDash.tableRow}>
                    <View style={webDash.tableCellWide}><Text style={webDash.tableText}>{name}</Text></View>
                    <View style={webDash.tableCell}><TextInput style={[webDash.formInput, { width: 120 }]} value={index === 0 ? '96' : '88'} /></View>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={[webDash.buttonBlue, { alignSelf: 'flex-end', marginTop: 18 }]}><Text style={webDash.buttonTextLight}>Save Marks</Text></TouchableOpacity>
            </View>
          </>
        )}

        {!loading && tab === 'mySuggestion' && (
          <>
            <WebPageTitle title="My Suggestion" subtitle="Review and manage your submitted suggestions or complaints." />
            {suggestions.length === 0 ? (
              <View style={webDash.emptyBox}><Text style={webDash.emptyText}>No submitted suggestions yet.</Text></View>
            ) : (
              <View style={webDash.table}>
                <View style={[webDash.tableRow, webDash.tableHeader]}>
                  {['Type', 'Title', 'Status', 'Reply', 'Created'].map((h) => (
                    <View key={h} style={webDash.tableCell}><Text style={webDash.tableHeadText}>{h}</Text></View>
                  ))}
                </View>
                {suggestions.map((item) => (
                  <View key={item._id} style={webDash.tableRow}>
                    <View style={webDash.tableCell}><StatusPill label={item.type} tone={item.type === 'Complaint' ? 'yellow' : 'blue'} /></View>
                    <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.title}</Text></View>
                    <View style={webDash.tableCell}><StatusPill label={item.status} tone={item.status === 'Resolved' ? 'green' : 'blue'} /></View>
                    <View style={webDash.tableCell}><Text style={webDash.tableText}>{item.reply || '-'}</Text></View>
                    <View style={webDash.tableCell}><Text style={webDash.tableText}>{formatAppDate(item.createdAt)}</Text></View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {!loading && tab === 'newSuggestion' && (
          <>
            <WebPageTitle title="New Suggestion/Complaints" subtitle="Create a new suggestion or complaint for admin review." />
            <View style={webDash.sectionCard}>
              <Text style={webDash.filterLabel}>Type</Text>
              <View style={webDash.segmentRow}>
                {['Suggestion', 'Complaint'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[webDash.segmentButton, suggestionType === type && webDash.segmentButtonActive]}
                    onPress={() => setSuggestionType(type)}
                  >
                    <Text style={[webDash.segmentText, suggestionType === type && webDash.segmentTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[webDash.filterLabel, { marginTop: 14 }]}>Title</Text>
              <TextInput
                style={webDash.formInput}
                placeholder="Enter title"
                value={suggestionTitle}
                onChangeText={setSuggestionTitle}
                placeholderTextColor="#94a3b8"
              />
              <Text style={[webDash.filterLabel, { marginTop: 14 }]}>Message</Text>
              <TextInput
                style={[webDash.formInput, webDash.textArea]}
                placeholder="Write your suggestion or complaint"
                value={suggestionMessage}
                onChangeText={setSuggestionMessage}
                placeholderTextColor="#94a3b8"
                multiline
              />
              <TouchableOpacity
                style={[webDash.buttonBlue, { marginTop: 18 }]}
                onPress={submitTutorSuggestion}
                disabled={submittingSuggestion}
              >
                <Text style={webDash.buttonTextLight}>{submittingSuggestion ? 'Submitting...' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </WebDashboardShell>
  );
};

const tut = StyleSheet.create({
  header: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRole: { color: '#bae6fd', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  logoutBtn: { backgroundColor: '#0284c7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  logoutText: { color: '#e0f2fe', fontWeight: '700', fontSize: 13 },
  emailBar: { backgroundColor: '#0284c7', paddingHorizontal: 20, paddingVertical: 8 },
  emailText: { color: '#bae6fd', fontSize: 12 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, backgroundColor: '#f0f9ff' },
  tabBtnActive: { backgroundColor: '#0ea5e9' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#0284c7' },
  tabTextActive: { color: '#fff' },
  scroll: { padding: 14, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  profileAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#bae6fd',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  profileAvatarText: { color: '#0369a1', fontSize: 24, fontWeight: '900' },
  profileRole: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  profileInfoBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 12,
    marginBottom: 12,
  },
  profileInfoLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  profileInfoValue: { color: '#0f172a', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  courseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f9ff', gap: 10 },
  courseIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  courseName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  courseHall: { fontSize: 12, color: '#0284c7', marginTop: 3, fontWeight: '600' },
  courseSub: { fontSize: 12, color: '#64748b' },
  courseFee: { fontSize: 14, fontWeight: '800', color: '#0ea5e9', textAlign: 'right' },
  studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f9ff', gap: 10 },
  studentAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#bae6fd', alignItems: 'center', justifyContent: 'center' },
  studentAvatarText: { color: '#0284c7', fontWeight: '800', fontSize: 17 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  studentEmail: { fontSize: 12, color: '#64748b' },
  enrollRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f9ff', gap: 10 },
  enrollIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center' },
  enrollName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  enrollSub: { fontSize: 12, color: '#64748b' },
  statusChip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  chipGreen: { backgroundColor: '#dcfce7' },
  chipBlue: { backgroundColor: '#dbeafe' },
  chipRed: { backgroundColor: '#fee2e2' },
  chipGray: { backgroundColor: '#f1f5f9' },
  chipText: { fontSize: 10, fontWeight: '700', color: '#0f172a' },
  ttRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f9ff' },
  ttDayBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#bae6fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ttDayText: { color: '#0369a1', fontWeight: '800', fontSize: 12 },
  ttMeta: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  input: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  addBtn: { backgroundColor: '#0ea5e9', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.7 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 12, fontSize: 13 },
});


// ─────────────────────────────────────────────────────────────────────────────
const STUDENT_WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STUDENT_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STUDENT_RESULT_TERMS = ['Term 1', 'Term 2', 'Term 3'];
const STUDENT_RESULT_SUBJECTS = ['Tamil', 'Maths', 'Science', 'Religion', 'English', 'Civics'];
const STUDENT_TIME_SLOTS = ['07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00'];

const buildStudentCalendar = (date) => {
  const baseDate = date || new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstWeekDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstWeekDay; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return {
    monthLabel: baseDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    today: baseDate.getDate(),
    cells,
  };
};

const StudentPageTitle = ({ title, subtitle }) => (
  <View style={studentDash.pageTitleWrap}>
    <Text style={studentDash.pageTitle}>{title}</Text>
    <Text style={studentDash.pageSubtitle}>{subtitle}</Text>
  </View>
);

const StudentMetricCard = ({ label, value, detail }) => (
  <View style={studentDash.metricCard}>
    <Text style={studentDash.metricLabel}>{label}</Text>
    <Text style={studentDash.metricValue}>{value}</Text>
    {detail ? <Text style={studentDash.metricDetail}>{detail}</Text> : null}
  </View>
);

const StudentDashboardShell = ({
  user,
  activeTab,
  onTabChange,
  menuItems,
  onLogout,
  onOpenProfile,
  isDesktop,
  children,
}) => {
  const initials = (user.name || 'Student')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={studentShell.page}>
      <View style={[studentShell.header, { paddingTop: 12 + ANDROID_TOP_INSET }]}>
        <View style={studentShell.headerLeft}>
          <View style={studentShell.logoBadge}>
            <Text style={studentShell.logoText}>NK</Text>
          </View>
          <View style={studentShell.titleBlock}>
            <Text style={studentShell.welcome}>Welcome, Student!</Text>
            <Text style={studentShell.brandName}>{BRAND_NAME}</Text>
          </View>
        </View>

        <View style={studentShell.headerRight}>
          <TouchableOpacity style={studentShell.profileButton} onPress={onOpenProfile}>
            <Text style={studentShell.profileText}>{initials}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={studentShell.logoutButton} onPress={onLogout}>
            <Text style={studentShell.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[studentShell.body, isDesktop ? studentShell.bodyDesktop : studentShell.bodyMobile]}>
        <View style={[studentShell.sidebar, isDesktop ? studentShell.sidebarDesktop : studentShell.sidebarMobile]}>
          <ScrollView
            horizontal={!isDesktop}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              studentShell.sidebarScroll,
              isDesktop && studentShell.sidebarScrollDesktop,
            ]}
          >
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  studentShell.sidebarButton,
                  activeTab === item.key && studentShell.sidebarButtonActive,
                  isDesktop && studentShell.sidebarButtonDesktop,
                ]}
                onPress={() => onTabChange(item.key)}
              >
                <Text
                  style={[
                    studentShell.sidebarButtonText,
                    activeTab === item.key && studentShell.sidebarButtonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={studentShell.contentArea}>
          <ScrollView contentContainerStyle={studentShell.contentScroll} showsVerticalScrollIndicator={false}>
            <View style={studentShell.contentCard}>{children}</View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const StudentDashboard = ({ token, user, onUserUpdated, onLogout }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isWide = width >= 760;
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [profileName, setProfileName] = useState(user.name || '');
  const [profileEmail, setProfileEmail] = useState(user.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [suggestionType, setSuggestionType] = useState('Suggestion');
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cData, eData, tData, suggestionData] = await Promise.all([
        request('/api/courses?status=active', { token }),
        request('/api/enrollments', { token }),
        request('/api/timetable', { token }),
        request('/api/suggestions?mine=true', { token }),
      ]);
      setCourses(cData.courses || []);
      setEnrollments(eData.enrollments || []);
      setTimetable(tData.timetable || []);
      setSuggestions(suggestionData.suggestions || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setProfileName(user.name || '');
    setProfileEmail(user.email || '');
  }, [user.name, user.email]);

  const calendar = buildStudentCalendar(new Date());
  const currentDayName = STUDENT_WEEK_DAYS[new Date().getDay()];
  const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const currentDateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const lastUpdated = new Date().toLocaleTimeString('en-US');
  const currentGrade =
    enrollments.find((item) => item.course?.grade)?.course?.grade ||
    courses.find((course) => course.grade)?.grade ||
    'Grade 7';
  const timetableStatus = timetable.length > 0 ? 'Auto-updating' : 'Waiting for entries';
  const timetableSubjects = [
    ...new Set(
      timetable
        .map((entry) => entry.subject || entry.title)
        .filter(Boolean)
    ),
  ];
  const resultSubjects = timetableSubjects.length > 0 ? timetableSubjects.slice(0, 6) : STUDENT_RESULT_SUBJECTS;
  const todayClasses = timetable.filter((entry) => entry.dayOfWeek === currentDayName);
  const paymentRows = (enrollments.length > 0
    ? enrollments
    : [{ _id: 'placeholder', course: { fee: 3500, name: 'Monthly Tuition Fee' } }]).map((entry, index) => ({
      id: entry._id || `payment-${index}`,
      month: currentMonthLabel,
      amount: entry.course?.fee || 3500,
      status: 'Pending',
    }));
  const pendingPaymentsCount = paymentRows.filter((row) => row.status === 'Pending').length;
  const attendanceStats = {
    percentage: 75,
    workingDays: 4,
    present: 3,
    absent: 1,
  };
  const metricCards = [
    { label: 'Total Enrolled Classes', value: String(enrollments.length) },
    { label: 'Attendance Percentage', value: `${attendanceStats.percentage}%` },
    { label: 'Pending Payments Count', value: String(pendingPaymentsCount) },
    { label: 'Upcoming Exams Count', value: '2' },
  ];
  const timetableRows = STUDENT_TIME_SLOTS.map((slot) => {
    const [startTime, endTime] = slot.split(' - ');
    return {
      slot,
      cells: STUDENT_WEEK_DAYS.map((day) => {
        const entry = timetable.find(
          (item) => item.dayOfWeek === day && item.startTime === startTime && item.endTime === endTime
        );
        return { day, entry };
      }),
    };
  });

  const submitSuggestion = async () => {
    if (!suggestionText.trim()) {
      Alert.alert('Missing details', 'Please enter your suggestion or complaint first.');
      return;
    }

    setSubmittingSuggestion(true);
    try {
      const data = await request('/api/suggestions', {
        method: 'POST',
        token,
        body: {
          type: suggestionType,
          message: suggestionText.trim(),
        },
      });
      setSuggestions((current) => [data.suggestion, ...current]);
      setSuggestionText('');
      setTab('mySuggestion');
      Alert.alert('Submitted', 'Your message has been saved in My Suggestion.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  const updateStudentProfile = async () => {
    const name = profileName.trim();
    const email = profileEmail.trim();

    if (!name || !email) {
      Alert.alert('Missing Fields', 'Name and email are required.');
      return;
    }

    setProfileSaving(true);
    try {
      const data = await request('/api/auth/profile', {
        method: 'PUT',
        token,
        body: { name, email },
      });
      onUserUpdated(data.user);
      setProfileName(data.user.name || '');
      setProfileEmail(data.user.email || '');
      Alert.alert('Updated', data.message || 'Student profile updated successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const studentMenuItems = [
    { key: 'overview', label: 'Overview' },
    { key: 'timetable', label: 'Timetable' },
    { key: 'fee', label: 'Fee & Payment' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'results', label: 'Exam & Results' },
    { key: 'mySuggestion', label: 'My Suggestion' },
    { key: 'newSuggestion', label: 'New Suggestion/Complaints' },
    { key: 'profile', label: 'Student Profile' },
  ];

  return (
    <StudentDashboardShell
      user={user}
      activeTab={tab}
      onTabChange={setTab}
      menuItems={studentMenuItems}
      onLogout={onLogout}
      onOpenProfile={() => setTab('profile')}
      isDesktop={isDesktop}
    >
      {loading ? (
        <View style={studentDash.loadingWrap}>
          <ActivityIndicator color="#2f60d3" size="large" />
          <Text style={studentDash.loadingText}>Loading student dashboard...</Text>
        </View>
      ) : null}

      {!loading && tab === 'overview' && (
        <>
          <StudentPageTitle
            title="Overview"
            subtitle="Review your classes, attendance, payments, exams, and important updates in one place."
          />

          <View style={[studentDash.metricGrid, isWide && studentDash.metricGridWide]}>
            {metricCards.map((card) => (
              <View key={card.label} style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemWide]}>
                <StudentMetricCard label={card.label} value={card.value} />
              </View>
            ))}
          </View>

          <View style={[studentDash.splitGrid, isWide && studentDash.splitGridWide]}>
            <View style={[studentDash.panel, isWide && studentDash.splitPanel]}>
              <Text style={studentDash.panelTitle}>Today's Classes</Text>
              <View style={studentDash.placeholderCard}>
                {todayClasses.length === 0 ? (
                  <Text style={studentDash.placeholderText}>No classes scheduled for today.</Text>
                ) : (
                  todayClasses.map((entry) => (
                    <View key={entry._id} style={studentDash.classRow}>
                      <Text style={studentDash.classTitle}>{formatTimetableEntryTitle(entry, courses)}</Text>
                      <Text style={studentDash.classMeta}>{entry.startTime} - {entry.endTime}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={[studentDash.panel, isWide && studentDash.splitPanel]}>
              <Text style={studentDash.panelTitle}>Latest Announcements</Text>
              <View style={studentDash.placeholderCard}>
                <Text style={studentDash.placeholderText}>No announcements available.</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {!loading && tab === 'fee' && (
        <>
          <StudentPageTitle
            title="Fee & Payment"
            subtitle="Review your monthly fee amount, upload payment receipt, and track payment status."
          />

          <View style={studentDash.panel}>
            <Text style={studentDash.panelTitle}>Fee & Payment</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={studentDash.tableWrap}>
                <View style={[studentDash.tableRow, studentDash.tableHeader]}>
                  <Text style={[studentDash.tableCell, studentDash.tableHead]}>Month</Text>
                  <Text style={[studentDash.tableCell, studentDash.tableHead]}>Payment Amount</Text>
                  <Text style={[studentDash.tableCellWide, studentDash.tableHead]}>Update Payment Receipt</Text>
                  <Text style={[studentDash.tableCell, studentDash.tableHead]}>Status</Text>
                </View>

                {paymentRows.map((row) => (
                  <View key={row.id} style={studentDash.tableRow}>
                    <Text style={studentDash.tableCell}>{row.month}</Text>
                    <Text style={studentDash.tableCell}>LKR {row.amount}</Text>
                    <View style={studentDash.tableCellWide}>
                      <TouchableOpacity style={studentDash.receiptButton}>
                        <Text style={studentDash.receiptButtonText}>Upload Receipt</Text>
                      </TouchableOpacity>
                      <Text style={studentDash.receiptLink}>View Uploaded Receipt</Text>
                    </View>
                    <View style={studentDash.tableCell}>
                      <View style={studentDash.pendingPill}>
                        <Text style={studentDash.pendingPillText}>{row.status}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}

      {!loading && tab === 'attendance' && (
        <>
          <StudentPageTitle
            title="Attendance"
            subtitle="Review your class attendance summary and full attendance history."
          />

          <View style={[studentDash.splitGrid, isWide && studentDash.splitGridWide]}>
            <View style={[studentDash.attendanceColumn, isWide && studentDash.attendanceColumnWide]}>
              <View style={studentDash.welcomeCard}>
                <View>
                  <Text style={studentDash.welcomeCardTitle}>Welcome,</Text>
                  <Text style={studentDash.welcomeCardName}>Student</Text>
                </View>
                <View style={studentDash.studentBadge}>
                  <Text style={studentDash.studentBadgeText}>ST</Text>
                </View>
              </View>

              <View style={studentDash.dateStrip}>
                <Text style={studentDash.dateStripText}>{currentDateLabel}</Text>
              </View>

              <View style={studentDash.gaugeCard}>
                <View style={studentDash.gaugeArcBase} />
                <View style={studentDash.gaugeArcFill} />
                <View style={studentDash.gaugeCenter}>
                  <Text style={studentDash.gaugeTime}>21:26:50</Text>
                  <Text style={studentDash.gaugeToday}>Today</Text>
                  <Text style={studentDash.gaugePercent}>Attendance {attendanceStats.percentage}%</Text>
                </View>
              </View>

              <View style={studentDash.attendanceNavRow}>
                <View style={studentDash.attendanceNavButton}>
                  <Text style={studentDash.attendanceNavLabel}>Home</Text>
                </View>
                <View style={[studentDash.attendanceNavButton, studentDash.attendanceNavButtonActive]}>
                  <Text style={[studentDash.attendanceNavLabel, studentDash.attendanceNavLabelActive]}>+</Text>
                </View>
                <View style={studentDash.attendanceNavButton}>
                  <Text style={studentDash.attendanceNavLabel}>History</Text>
                </View>
              </View>
            </View>

            <View style={[studentDash.attendanceColumn, isWide && studentDash.attendanceColumnWide]}>
              <View style={studentDash.panel}>
                <View style={studentDash.calendarTop}>
                  <Text style={studentDash.calendarTitle}>Attendance</Text>
                </View>
                <View style={studentDash.calendarGrid}>
                  {STUDENT_WEEK_SHORT.map((day) => (
                    <Text key={day} style={studentDash.calendarDayLabel}>{day}</Text>
                  ))}
                  {calendar.cells.map((day, index) => (
                    <View
                      key={`${day || 'blank'}-${index}`}
                      style={[
                        studentDash.calendarCell,
                        day === calendar.today && studentDash.calendarCellToday,
                      ]}
                    >
                      {day ? (
                        <Text
                          style={[
                            studentDash.calendarCellText,
                            day === calendar.today && studentDash.calendarCellTextToday,
                          ]}
                        >
                          {day}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>

              <View style={studentDash.monthPager}>
                <Text style={studentDash.monthPagerArrow}>{'<'}</Text>
                <Text style={studentDash.monthPagerText}>{calendar.monthLabel}</Text>
                <Text style={studentDash.monthPagerArrow}>{'>'}</Text>
              </View>

              <View style={studentDash.workingDaysCard}>
                <Text style={studentDash.workingDaysLabel}>Total Working Days</Text>
                <View style={studentDash.dayCountPill}>
                  <Text style={studentDash.dayCountText}>{attendanceStats.workingDays} Days</Text>
                </View>
              </View>

              <View style={studentDash.attendanceStatGrid}>
                <View style={[studentDash.attendanceStatCard, studentDash.absentCard]}>
                  <Text style={studentDash.attendanceStatHeading}>Total Absent</Text>
                  <Text style={studentDash.attendanceStatValue}>{attendanceStats.absent}</Text>
                  <Text style={studentDash.attendanceStatSub}>days</Text>
                </View>
                <View style={[studentDash.attendanceStatCard, studentDash.presentCard]}>
                  <Text style={studentDash.attendanceStatHeading}>Total Present</Text>
                  <Text style={studentDash.attendanceStatValue}>{attendanceStats.present}</Text>
                  <Text style={studentDash.attendanceStatSub}>days</Text>
                </View>
              </View>
            </View>
          </View>
        </>
      )}

      {!loading && tab === 'results' && (
        <>
          <StudentPageTitle
            title="Exams & Results"
            subtitle="Review your exam performance and average mark in one place."
          />

          <View style={[studentDash.metricGrid, isWide && studentDash.metricGridWide]}>
            <View style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemHalf]}>
              <StudentMetricCard label="Average Mark" value="0%" />
            </View>
            <View style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemHalf]}>
              <StudentMetricCard label="Total Marks" value="0" />
            </View>
          </View>

          <View style={studentDash.panel}>
            <Text style={studentDash.panelTitle}>Exam Results</Text>
            <View style={studentDash.termButtonRow}>
              {STUDENT_RESULT_TERMS.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={[
                    studentDash.termButton,
                    selectedTerm === term && studentDash.termButtonActive,
                  ]}
                  onPress={() => setSelectedTerm(term)}
                >
                  <Text
                    style={[
                      studentDash.termButtonText,
                      selectedTerm === term && studentDash.termButtonTextActive,
                    ]}
                  >
                    {term}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={studentDash.tableWrap}>
                <View style={[studentDash.tableRow, studentDash.tableHeader]}>
                  <Text style={[studentDash.tableCellWide, studentDash.tableHead]}>Subject</Text>
                  <Text style={[studentDash.tableCell, studentDash.tableHead]}>Marks Obtained</Text>
                  <Text style={[studentDash.tableCell, studentDash.tableHead]}>Highest Marks</Text>
                </View>
                {resultSubjects.map((subject) => (
                  <View key={`${selectedTerm}-${subject}`} style={studentDash.tableRow}>
                    <Text style={studentDash.tableCellWide}>{subject}</Text>
                    <Text style={studentDash.tableCell}>0</Text>
                    <Text style={studentDash.tableCell}>100</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}

      {!loading && tab === 'timetable' && (
        <>
          <StudentPageTitle
            title="Timetable"
            subtitle="Review your weekly class schedule with subject, tutor, and time slot details."
          />

          <View style={[studentDash.metricGrid, isWide && studentDash.metricGridWide]}>
            <View style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemHalf]}>
              <StudentMetricCard label="Current Grade" value={currentGrade} />
            </View>
            <View style={[studentDash.metricGridItem, isWide && studentDash.metricGridItemHalf]}>
              <StudentMetricCard label="Timetable Status" value={timetableStatus} detail={`Last updated: ${lastUpdated}`} />
            </View>
          </View>

          <View style={studentDash.panel}>
            <Text style={studentDash.panelTitle}>Weekly Timetable</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={studentDash.timetableWrap}>
                <View style={[studentDash.timetableRow, studentDash.tableHeader]}>
                  <Text style={[studentDash.timeCell, studentDash.tableHead]}>Time</Text>
                  {STUDENT_WEEK_DAYS.map((day) => (
                    <Text key={day} style={[studentDash.scheduleCell, studentDash.tableHead]}>{day}</Text>
                  ))}
                </View>

                {timetableRows.map((row) => (
                  <View key={row.slot} style={studentDash.timetableRow}>
                    <Text style={studentDash.timeCell}>{row.slot}</Text>
                    {row.cells.map(({ day, entry }) => {
                      const isWeekend = day === 'Saturday' || day === 'Sunday';
                      return (
                        <View
                          key={`${row.slot}-${day}`}
                          style={[
                            studentDash.scheduleCell,
                            studentDash.scheduleBox,
                            entry
                              ? studentDash.scheduleBoxFilled
                              : isWeekend
                                ? studentDash.scheduleBoxEmpty
                                : studentDash.scheduleBoxUnavailable,
                          ]}
                        >
                          {entry ? (
                            <>
                              <Text style={studentDash.scheduleTitle} numberOfLines={2}>{formatTimetableEntryTitle(entry, courses)}</Text>
                              <Text style={studentDash.scheduleSub} numberOfLines={2}>
                                {[entry.subject, entry.room].filter(Boolean).join(' • ')}
                              </Text>
                            </>
                          ) : (
                            <Text style={isWeekend ? studentDash.scheduleEmptyText : studentDash.scheduleUnavailableText}>
                              {isWeekend ? 'No class' : 'Not available'}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}

      {!loading && tab === 'mySuggestion' && (
        <>
          <StudentPageTitle
            title="My Suggestion"
            subtitle="Review the suggestions and complaints you have submitted."
          />

          <View style={studentDash.panel}>
            <Text style={studentDash.panelTitle}>My Suggestion</Text>
            {suggestions.length === 0 ? (
              <View style={studentDash.placeholderCard}>
                <Text style={studentDash.placeholderText}>You have not submitted any suggestions yet.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={studentDash.tableWrap}>
                  <View style={[studentDash.tableRow, studentDash.tableHeader]}>
                    <Text style={[studentDash.tableCell, studentDash.tableHead]}>Type</Text>
                    <Text style={[studentDash.tableCell, studentDash.tableHead]}>Status</Text>
                    <Text style={[studentDash.tableCell, studentDash.tableHead]}>Submitted On</Text>
                    <Text style={[studentDash.tableCellWide, studentDash.tableHead]}>Message</Text>
                  </View>
                  {suggestions.map((item) => (
                    <View key={item._id} style={studentDash.tableRow}>
                      <Text style={studentDash.tableCell}>{item.type}</Text>
                      <View style={studentDash.tableCell}>
                        <View style={studentDash.pendingPill}>
                          <Text style={studentDash.pendingPillText}>{item.status}</Text>
                        </View>
                      </View>
                      <Text style={studentDash.tableCell}>{formatAppDate(item.createdAt)}</Text>
                      <Text style={studentDash.tableCellWide}>{item.message}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </>
      )}

      {!loading && tab === 'newSuggestion' && (
        <>
          <StudentPageTitle
            title="New Suggestion/Complaints"
            subtitle="Create a new suggestion or complaint for review."
          />

          <View style={studentDash.panel}>
            <Text style={studentDash.panelTitle}>New Suggestion</Text>
            <View style={studentDash.toggleRow}>
              {['Suggestion', 'Complaint'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    studentDash.toggleButton,
                    suggestionType === type && studentDash.toggleButtonActive,
                  ]}
                  onPress={() => setSuggestionType(type)}
                >
                  <Text
                    style={[
                      studentDash.toggleButtonText,
                      suggestionType === type && studentDash.toggleButtonTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[studentDash.textInput, studentDash.textArea]}
              placeholder="Write your message here"
              value={suggestionText}
              onChangeText={setSuggestionText}
              multiline
              placeholderTextColor="#8ca0c3"
              textAlignVertical="top"
            />

            <TouchableOpacity style={studentDash.primaryButton} onPress={submitSuggestion} disabled={submittingSuggestion}>
              <Text style={studentDash.primaryButtonText}>{submittingSuggestion ? 'Submitting...' : 'Submit Message'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {!loading && tab === 'profile' && (
        <>
          <StudentPageTitle
            title="Student Profile"
            subtitle="Review and update your account details."
          />

          <View style={studentDash.profileCard}>
            <View style={studentDash.profileAvatar}>
              <Text style={studentDash.profileAvatarText}>
                {(user.name || 'S').split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <Text style={studentDash.profileRole}>STUDENT ACCOUNT</Text>

            <TextInput
              style={studentDash.profileInput}
              placeholder="Full name"
              value={profileName}
              onChangeText={setProfileName}
              showSoftInputOnFocus
              placeholderTextColor="#8ca0c3"
            />

            <TextInput
              style={studentDash.profileInput}
              placeholder="Email"
              value={profileEmail}
              onChangeText={setProfileEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              showSoftInputOnFocus
              placeholderTextColor="#8ca0c3"
            />

            <View style={studentDash.profileInfoBox}>
              <Text style={studentDash.profileInfoLabel}>Role</Text>
              <Text style={studentDash.profileInfoValue}>Student</Text>
              <Text style={studentDash.profileInfoLabel}>Status</Text>
              <Text style={studentDash.profileInfoValue}>{user.approvalStatus || 'approved'}</Text>
            </View>

            <TouchableOpacity
              style={[studentDash.primaryButton, profileSaving && studentDash.primaryButtonDisabled]}
              onPress={updateStudentProfile}
              disabled={profileSaving}
            >
              <Text style={studentDash.primaryButtonText}>{profileSaving ? 'Saving...' : 'Update Profile'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </StudentDashboardShell>
  );
};

const studentShell = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#dfeafc' },
  header: {
    backgroundColor: '#27498f',
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f7f9ff',
    borderWidth: 2,
    borderColor: '#dbe4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#27498f', fontSize: 14, fontWeight: '900' },
  titleBlock: { flex: 1 },
  welcome: { color: '#fff', fontSize: 18, fontWeight: '900' },
  brandName: { color: '#f7f9ff', fontSize: 12, fontWeight: '800', marginTop: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { color: '#1f2937', fontSize: 12, fontWeight: '800' },
  logoutButton: {
    backgroundColor: '#ef3b36',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  body: { flex: 1 },
  bodyDesktop: { flexDirection: 'row' },
  bodyMobile: { flexDirection: 'column' },
  sidebar: {
    backgroundColor: '#edf3ff',
    borderColor: '#b7c9ef',
  },
  sidebarDesktop: {
    width: 230,
    borderRightWidth: 1,
    paddingVertical: 18,
  },
  sidebarMobile: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  sidebarScroll: {
    paddingHorizontal: 12,
    gap: 10,
  },
  sidebarScrollDesktop: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sidebarButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  sidebarButtonDesktop: { width: '100%' },
  sidebarButtonActive: {
    backgroundColor: '#355594',
    shadowColor: '#223d72',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  sidebarButtonText: { color: '#101827', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  sidebarButtonTextActive: { color: '#fff' },
  contentArea: { flex: 1 },
  contentScroll: { padding: 16, paddingBottom: 40 },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 22,
    shadowColor: '#7e8fb1',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#dce6f7',
  },
});

const studentDash = StyleSheet.create({
  pageTitleWrap: { marginBottom: 20 },
  pageTitle: { color: '#102a4f', fontSize: 26, fontWeight: '900' },
  pageSubtitle: { color: '#74839e', fontSize: 14, lineHeight: 20, marginTop: 8 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { color: '#74839e', fontSize: 14, fontWeight: '700', marginTop: 12 },
  metricGrid: { gap: 14, marginBottom: 20 },
  metricGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  metricGridItem: { width: '100%' },
  metricGridItemWide: { width: '23%' },
  metricGridItemHalf: { width: '48%' },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#c5d1e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  metricLabel: {
    color: '#7f8a99',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricValue: { color: '#101827', fontSize: 24, fontWeight: '900', marginTop: 12 },
  metricDetail: { color: '#74839e', fontSize: 13, fontWeight: '700', marginTop: 8 },
  splitGrid: { gap: 16 },
  splitGridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  splitPanel: { flex: 1 },
  panel: {
    backgroundColor: '#fdfefe',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e6edf7',
    padding: 16,
    marginBottom: 16,
  },
  panelTitle: { color: '#1b2941', fontSize: 16, fontWeight: '900', marginBottom: 14 },
  placeholderCard: {
    borderWidth: 1,
    borderColor: '#dce5f2',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 76,
  },
  placeholderText: { color: '#7a869c', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  classRow: { width: '100%', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ecf1f7' },
  classTitle: { color: '#1e293b', fontSize: 14, fontWeight: '800' },
  classMeta: { color: '#7a869c', fontSize: 13, marginTop: 4 },
  tableWrap: {
    minWidth: 820,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f8',
  },
  tableHeader: { backgroundColor: '#dfe7f4' },
  tableHead: { color: '#334155', fontSize: 13, fontWeight: '900' },
  tableCell: {
    width: 170,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
    justifyContent: 'center',
  },
  tableCellWide: {
    width: 320,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
    justifyContent: 'center',
  },
  receiptButton: {
    borderWidth: 1,
    borderColor: '#73a4ea',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    minWidth: 150,
  },
  receiptButtonText: { color: '#2f60d3', fontSize: 14, fontWeight: '800' },
  receiptLink: { color: '#2f60d3', fontSize: 14, fontWeight: '800', marginTop: 10 },
  pendingPill: {
    backgroundColor: '#fde9a9',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  pendingPillText: { color: '#9e6a05', fontSize: 12, fontWeight: '900' },
  profileCard: {
    backgroundColor: '#fdfefe',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    padding: 20,
  },
  profileAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  profileAvatarText: { color: '#1d4ed8', fontSize: 28, fontWeight: '900' },
  profileRole: {
    color: '#355594',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  profileInput: {
    backgroundColor: '#f6f9ff',
    borderWidth: 1,
    borderColor: '#dce6f7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#1f2937',
    fontSize: 14,
    marginBottom: 12,
  },
  profileInfoBox: {
    backgroundColor: '#f6f9ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dce6f7',
    padding: 14,
    marginBottom: 16,
  },
  profileInfoLabel: { color: '#74839e', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  profileInfoValue: { color: '#1f2937', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  attendanceColumn: { width: '100%' },
  attendanceColumnWide: { flex: 1 },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeCardTitle: { color: '#243a63', fontSize: 16, fontWeight: '900' },
  welcomeCardName: { color: '#2b3951', fontSize: 13, fontWeight: '800', marginTop: 6 },
  studentBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#39aaf6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4aa4f3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 4,
  },
  studentBadgeText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  dateStrip: {
    backgroundColor: '#f4f8ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  dateStripText: { color: '#34445f', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  gaugeCard: {
    backgroundColor: '#f7fbff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  gaugeArcBase: {
    position: 'absolute',
    width: 210,
    height: 110,
    borderTopLeftRadius: 110,
    borderTopRightRadius: 110,
    borderTopWidth: 18,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderColor: '#d9e3f1',
    top: 72,
  },
  gaugeArcFill: {
    position: 'absolute',
    width: 170,
    height: 104,
    left: 66,
    top: 78,
    borderTopLeftRadius: 104,
    borderTopRightRadius: 104,
    borderTopWidth: 18,
    borderLeftWidth: 18,
    borderColor: '#3aaaf6',
  },
  gaugeCenter: { alignItems: 'center', paddingTop: 32 },
  gaugeTime: { color: '#101827', fontSize: 18, fontWeight: '900' },
  gaugeToday: { color: '#1e293b', fontSize: 14, fontWeight: '800', marginTop: 8 },
  gaugePercent: { color: '#4b5563', fontSize: 15, fontWeight: '800', marginTop: 14 },
  attendanceNavRow: { flexDirection: 'row', gap: 10 },
  attendanceNavButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    paddingVertical: 18,
    alignItems: 'center',
  },
  attendanceNavButtonActive: { backgroundColor: '#39aaf6' },
  attendanceNavLabel: { color: '#718096', fontSize: 13, fontWeight: '800' },
  attendanceNavLabelActive: { color: '#fff', fontSize: 18 },
  calendarTop: {
    borderWidth: 1,
    borderColor: '#e3ebf6',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: { color: '#1f2d44', fontSize: 16, fontWeight: '900' },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  calendarDayLabel: {
    width: '13%',
    color: '#8a98ac',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  calendarCell: {
    width: '13%',
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCellToday: {
    backgroundColor: '#f5fbff',
    borderWidth: 1,
    borderColor: '#5aa9eb',
  },
  calendarCellText: { color: '#4b5563', fontSize: 13, fontWeight: '700' },
  calendarCellTextToday: { color: '#2f60d3', fontWeight: '900' },
  monthPager: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthPagerArrow: { color: '#5b6b84', fontSize: 18, fontWeight: '900' },
  monthPagerText: { color: '#34445f', fontSize: 15, fontWeight: '900' },
  workingDaysCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  workingDaysLabel: { color: '#3a485e', fontSize: 16, fontWeight: '900' },
  dayCountPill: {
    backgroundColor: '#38aaf6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dayCountText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  attendanceStatGrid: { flexDirection: 'row', gap: 12 },
  attendanceStatCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    minHeight: 150,
  },
  absentCard: { backgroundColor: '#ff4ca0' },
  presentCard: { backgroundColor: '#2da4f7' },
  attendanceStatHeading: { color: '#fff', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  attendanceStatValue: { color: '#fff', fontSize: 48, fontWeight: '900', marginTop: 18 },
  attendanceStatSub: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  termButtonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  termButton: {
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d5dfec',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  termButtonActive: { backgroundColor: '#3267df', borderColor: '#3267df' },
  termButtonText: { color: '#29354b', fontSize: 14, fontWeight: '800' },
  termButtonTextActive: { color: '#fff' },
  timetableWrap: {
    minWidth: 1080,
    borderWidth: 1,
    borderColor: '#e3ebf6',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  timetableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f8',
  },
  timeCell: {
    width: 160,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '800',
  },
  scheduleCell: {
    width: 140,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
  },
  scheduleBox: {
    minHeight: 126,
    margin: 10,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleBoxUnavailable: { backgroundColor: '#ffe3e3', borderColor: '#f5bfc0' },
  scheduleBoxEmpty: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  scheduleBoxFilled: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc', paddingHorizontal: 8 },
  scheduleTitle: { color: '#0f172a', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  scheduleSub: { color: '#475569', fontSize: 12, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  scheduleUnavailableText: { color: '#b23a40', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  scheduleEmptyText: { color: '#98a5b8', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  toggleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cfd8e6',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  toggleButtonActive: { backgroundColor: '#355594', borderColor: '#355594' },
  toggleButtonText: { color: '#223049', fontSize: 14, fontWeight: '800' },
  toggleButtonTextActive: { color: '#fff' },
  textInput: {
    backgroundColor: '#f6f9ff',
    borderWidth: 1,
    borderColor: '#dce6f7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#1f2937',
    fontSize: 14,
  },
  textArea: { minHeight: 140, marginBottom: 16 },
  primaryButton: {
    backgroundColor: '#355594',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});

// CHANGE PASSWORD SCREEN
// Shown after login if mustChangePassword = true.
// Forces the user to set a new password before accessing their dashboard.
// ─────────────────────────────────────────────────────────────────────────────
const ChangePasswordScreen = ({ token, user, onPasswordChanged, onLogout }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current password.');
      return;
    }

    setLoading(true);
    try {
      // Call the change-password API endpoint
      const data = await request('/api/auth/change-password', {
        method: 'PUT',
        token,
        body: { currentPassword, newPassword },
      });
      // Pass the fresh token and updated user back to the parent
      onPasswordChanged(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={chpw.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={chpw.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={chpw.header}>
            <View style={chpw.iconWrap}>
              <Text style={chpw.icon}>🔐</Text>
            </View>
            <Text style={chpw.title}>Change Your Password</Text>
            <Text style={chpw.subtitle}>
              Welcome, {user.name.split(' ')[0]}! For security, you must set a
              new password before accessing your account.
            </Text>
          </View>

          {/* Form card */}
          <View style={chpw.card}>
            {/* Error message */}
            {error ? (
              <View style={chpw.errorBox}>
                <Text style={chpw.errorText}>⚠️  {error}</Text>
              </View>
            ) : null}

            <View style={chpw.inputWrap}>
              <Text style={chpw.label}>Current Password</Text>
              <TextInput
                style={chpw.input}
                placeholder="Your current / default password"
                placeholderTextColor="#94a3b8"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                showSoftInputOnFocus
              />
            </View>

            <View style={chpw.inputWrap}>
              <Text style={chpw.label}>New Password</Text>
              <TextInput
                style={chpw.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#94a3b8"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                showSoftInputOnFocus
              />
            </View>

            <View style={chpw.inputWrap}>
              <Text style={chpw.label}>Confirm New Password</Text>
              <TextInput
                style={chpw.input}
                placeholder="Re-enter your new password"
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                showSoftInputOnFocus
              />
            </View>

            <TouchableOpacity style={chpw.btn} onPress={handleSubmit} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={chpw.btnText}>Update Password →</Text>
              }
            </TouchableOpacity>

            {/* Allow user to logout and go back to login screen */}
            <TouchableOpacity style={chpw.logoutLink} onPress={onLogout}>
              <Text style={chpw.logoutLinkText}>← Back to Login</Text>
            </TouchableOpacity>
          </View>

          <Text style={chpw.note}>
            🔒 Your password is encrypted and never stored in plain text.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const chpw = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 28 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#f59e0b',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#991b1b',
    marginBottom: 14,
  },
  errorText: { color: '#fca5a5', fontSize: 13, lineHeight: 18 },
  inputWrap: { marginBottom: 14 },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 14,
  },
  btn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  btnText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  logoutLink: { alignItems: 'center', marginTop: 16 },
  logoutLinkText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  note: { color: '#334155', fontSize: 11, textAlign: 'center', marginTop: 20 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);

  const loadProfile = async (activeToken) => {
    const data = await request('/api/auth/me', { token: activeToken });
    return data.user || null;
  };

  useEffect(() => {
    const timeout = setTimeout(() => setBootLoading(false), 10000);
    const bootstrap = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (savedToken) {
          setToken(savedToken);
          const profile = await loadProfile(savedToken);
          setUser(profile);
        }
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        clearTimeout(timeout);
        setBootLoading(false);
      }
    };
    bootstrap();
  }, []);

  /**
   * Called by AuthScreen after a successful login.
   * Saves the token and sets the user in state.
   */
  const handleAuthenticated = async (newToken, userData) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    if (userData) {
      setUser(userData);
    } else {
      const profile = await loadProfile(newToken);
      setUser(profile);
    }
  };

  /**
   * Called by ChangePasswordScreen after the password is changed.
   * The backend returns a fresh token — we update storage and state.
   */
  const handlePasswordChanged = async (newToken, updatedUser) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(updatedUser);
  };

  const handleUserUpdated = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to remove auth token from storage:', error);
    } finally {
      setToken('');
      setUser(null);
    }
  };

  // ── Boot splash screen ──────────────────────────────────────────────────────
  if (bootLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 32 }}>🎓</Text>
        </View>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ color: '#94a3b8', marginTop: 14, fontSize: 14, fontWeight: '600' }}>Loading TuitionApp...</Text>
      </SafeAreaView>
    );
  }

  // ── Not logged in → show Auth screen ───────────────────────────────────────
  if (!token || !user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  // ── Forced password change → show Change Password screen ───────────────────
  // This intercepts the flow if the backend flagged mustChangePassword = true
  // (e.g., admin seeded with a default password, or tutor-created account)
  if (user.mustChangePassword) {
    return (
      <ChangePasswordScreen
        token={token}
        user={user}
        onPasswordChanged={handlePasswordChanged}
        onLogout={handleLogout}
      />
    );
  }

  // ── Role-based dashboard routing ────────────────────────────────────────────
  if (user.role === 'admin') {
    return <AdminDashboard token={token} user={user} onUserUpdated={handleUserUpdated} onLogout={handleLogout} />;
  }

  if (user.role === 'teacher') {
    return (
      <TutorDashboard
        token={token}
        user={user}
        onUserUpdated={handleUserUpdated}
        onLogout={handleLogout}
      />
    );
  }

  // Default: student
  return (
    <StudentDashboard
      token={token}
      user={user}
      onUserUpdated={handleUserUpdated}
      onLogout={handleLogout}
    />
  );
}
