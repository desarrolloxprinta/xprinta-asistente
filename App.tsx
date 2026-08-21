import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  Easing,
  ActivityIndicator,
  Alert,
  Linking,
  useColorScheme
} from 'react-native';
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import {
  Merriweather_400Regular_Italic,
  Merriweather_700Bold
} from '@expo-google-fonts/merriweather';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  Bookmark,
  FolderKanban,
  Settings,
  ExternalLink,
  Search,
  Volume2,
  X,
  ChevronUp,
  Cpu,
  Sliders,
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  LogOut,
  UserCheck,
  Database,
  Sun,
  Moon,
  Smartphone,
  Trash2,
  BookOpen,
  ChevronDown
} from 'lucide-react-native';

import { colors, lightTheme, darkTheme, typography, spacing, radius, ThemeColors } from './src/theme/tokens';
import { ThemeService, ThemePreference } from './src/services/themeService';
import { IdeaItem, IdeaCategory, UserProfile } from './src/types';
import { StorageService } from './src/services/storage';
import { ElevenLabsService, ELEVENLABS_VOICES } from './src/services/elevenlabs';
import { DictionaryService, DictionaryCategory } from './src/services/dictionaryService';
import { BlueAppService } from './src/services/blueapp';
import { OpenRouterService, TaskDraft } from './src/services/openrouter';
import { NasSyncService } from './src/services/nasSync';
import { AuthService, XPRINTA_AUTHORIZED_MEMBERS } from './src/services/auth';
import { SpeechService } from './src/services/speechService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TOTAL_PARTICLES = 650; // Densidad extrema compacta sin dispersión
const RINGS = [3, 8, 14, 22, 32, 45, 60, 78, 96, 115];

const OPENROUTER_MODELS = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Rápido)' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
];

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Merriweather_400Regular_Italic,
    Merriweather_700Bold
  });

  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('sergiogarcia@xprinta.com');
  const [loginPin, setLoginPin] = useState('1234');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Theme preference state (light by default, dark or auto)
  const systemColorScheme = useColorScheme();
  const [themePref, setThemePref] = useState<ThemePreference>('light');
  
  const activeTheme: ThemeColors = themePref === 'auto'
    ? (systemColorScheme === 'dark' ? darkTheme : lightTheme)
    : (themePref === 'dark' ? darkTheme : lightTheme);
  const styles = createStyles(activeTheme);

  // Main state
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [activeSectionTab, setActiveSectionTab] = useState<'ideas' | 'tasks' | 'links'>('ideas');
  const [selectedDetailItem, setSelectedDetailItem] = useState<IdeaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);

  // OpenRouter & ElevenLabs state
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [currentModel, setCurrentModel] = useState('openai/gpt-4o-mini');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('t8NIKqytDP52LZhxHPhn');
  const [technicalDictionary, setTechnicalDictionary] = useState<DictionaryCategory[]>([]);
  const [newDictTerm, setNewDictTerm] = useState('');
  const [selectedDictCatId, setSelectedDictCatId] = useState('materials');
  const [dictExpanded, setDictExpanded] = useState(false);
  const [dictSearchFilter, setDictSearchFilter] = useState('');

    // NAS WD My Cloud EX4100 state
  const [nasHost, setNasHost] = useState('http://10.254.80.28');
  const [nasPort, setNasPort] = useState('80');
  const [nasShare, setNasShare] = useState('Public/Xprinta-Brain');
  const [nasUser, setNasUser] = useState('admin');
  const [nasPassword, setNasPassword] = useState('');
  const [nasSyncing, setNasSyncing] = useState(false);
  const [nasStatusMsg, setNasStatusMsg] = useState('');

  // Modals & Panels
  const [ideasModalVisible, setIdeasModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // New Idea Fields
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<string>('General');
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [isAddingNewCat, setIsAddingNewCat] = useState<boolean>(false);
  const [newUrl, setNewUrl] = useState('');

  // Voice Interaction State
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('Toca el campo cuántico para hablar');
  const [assistantResponse, setAssistantResponse] = useState<string>('');
  const [activeTaskDraft, setActiveTaskDraft] = useState<TaskDraft | null>(null);

  // Animations & Dynamic Living Core
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const counterRotationAnim = useRef(new Animated.Value(0)).current;
  const frequencyPulse = useRef(new Animated.Value(1)).current;
  const idlePulseAnim = useRef(new Animated.Value(1)).current;
  const coreGlowAnim = useRef(new Animated.Value(0.4)).current;
  const innerSpinAnim = useRef(new Animated.Value(0)).current;

  const particleField = useRef(
    Array.from({ length: TOTAL_PARTICLES }, (_, i) => {
      // Distribución hiper-compacta: 650 micropartículas ultra-juntas
      // 150 en el núcleo puro (2px a 18px), 300 en órbita media (18px a 65px), y 200 en corona externa contenida (65px a 115px)
      let baseRadius: number;
      if (i < 150) {
        baseRadius = 2 + Math.random() * 16;
      } else if (i < 450) {
        const u = Math.pow(Math.random(), 1.2);
        baseRadius = 18 + u * 47;
      } else {
        const u = Math.pow(Math.random(), 1.5);
        baseRadius = 65 + u * 50;
      }
      
      const angle = Math.random() * 2 * Math.PI;
      const size = baseRadius < 22 ? 0.9 : (baseRadius < 55 ? 1.1 : 1.3);
      const isCore = baseRadius < 22;
      const opacity = isCore ? (0.85 + Math.random() * 0.15) : (0.40 + Math.random() * 0.45);
      
      let pColor = colors.primary;
      if (baseRadius < 14) {
        pColor = '#FFFFFF';
      } else if (baseRadius < 30) {
        pColor = '#FFA845';
      } else if (baseRadius < 70) {
        pColor = '#F18108';
      } else {
        pColor = '#D06B02';
      }

      return {
        id: i,
        baseRadius,
        angle,
        size,
        opacity,
        color: pColor,
        x: Math.cos(angle) * baseRadius,
        y: Math.sin(angle) * baseRadius,
      };
    })
  ).current;

  useEffect(() => {
    checkAuthentication();
    startParticleEngine();

    // 1. Manejar enlace/texto compartido al abrir la app desde Share Sheet
    const handleIncomingUrl = (event: { url: string }) => {
      if (event?.url) {
        processSharedContent(event.url);
      }
    };

    Linking.getInitialURL().then(url => {
      if (url) {
        processSharedContent(url);
      }
    });

    const sub = Linking.addEventListener('url', handleIncomingUrl);
    return () => sub.remove();
  }, []);

  const processSharedContent = async (rawUrl: string) => {
    if (!rawUrl) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Si viene como link compartido de Instagram u otra red
    let cleanUrl = rawUrl;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      setNewUrl(cleanUrl);
      setNewTitle('Referencia Externa Compartida');
      setNewCategory('Diseño');
      setAddModalVisible(true);
    }
  };

  const checkAuthentication = async () => {
    setAuthChecking(true);
    const user = await AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      await loadInitialData(user);
    }
    setAuthChecking(false);
  };

  const handleLogin = async (emailToUse?: string, pinToUse?: string) => {
    const targetEmail = emailToUse || loginEmail;
    const targetPin = pinToUse || loginPin;

    setLoginLoading(true);
    setLoginError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await AuthService.login(targetEmail, targetPin);
    setLoginLoading(false);

    if (result.success && result.user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurrentUser(result.user);
      await loadInitialData(result.user);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoginError(result.error || 'Credenciales no autorizadas.');
    }
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AuthService.logout();
    setCurrentUser(null);
    setIdeas([]);
    setActiveTaskDraft(null);
    setSettingsVisible(false);
  };

  const loadInitialData = async (userProfile?: UserProfile | null) => {
    const savedTheme = await ThemeService.getThemePreference();
    setThemePref(savedTheme);
    const activeUser = userProfile || currentUser;
    const loadedIdeas = await StorageService.getIdeas(activeUser?.id);
    const loadedProjects = await BlueAppService.fetchProjects();
    const key = await OpenRouterService.getApiKey();
    const model = await OpenRouterService.getModel();
    const elKey = await ElevenLabsService.getApiKey();
    const savedVoice = await ElevenLabsService.getVoiceId();
    const loadedDict = await DictionaryService.getDictionary();
    
    setIdeas(loadedIdeas);
    setProjects(loadedProjects);
    setOpenRouterKey(key);
    setCurrentModel(model);
    setElevenLabsKey(elKey);
    setSelectedVoiceId(savedVoice);
    setTechnicalDictionary(loadedDict);
  };

  const startParticleEngine = () => {
    // 1. Rotación viva de enjambre exterior
    Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 2. Contra-rotación dinámica
    Animated.loop(
      Animated.timing(counterRotationAnim, {
        toValue: 1,
        duration: 13000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 3. Rotación ultra-rápida del núcleo interno
    Animated.loop(
      Animated.timing(innerSpinAnim, {
        toValue: 1,
        duration: 7000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 4. Respiración cuántica constante (pulso de vida continuo listo para esperar toque)
    Animated.loop(
      Animated.sequence([
        Animated.timing(idlePulseAnim, {
          toValue: 1.08,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(idlePulseAnim, {
          toValue: 0.94,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 5. Resplandor pulsante del núcleo
    Animated.loop(
      Animated.sequence([
        Animated.timing(coreGlowAnim, {
          toValue: 0.9,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(coreGlowAnim, {
          toValue: 0.35,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const processUserVoiceQuery = async (speechText: string) => {
    if (!speechText || speechText.trim().length === 0) {
      setIsListening(false);
      setIsProcessingAI(false);
      setVoiceStatus('Toca para hablar');
      return;
    }

    setIsListening(false);
    setIsProcessingAI(true);
    setVoiceStatus('Pensando...');

    Animated.timing(frequencyPulse, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    try {
      const members = await AuthService.getMembers();
      const distinctCats = userCategories.filter(c => c !== 'Todos');
      const aiResponse = await OpenRouterService.chatWithAssistant(
        speechText,
        currentUser,
        members,
        projects,
        distinctCats,
        activeTaskDraft,
        ideas
      );
      
      setIsProcessingAI(false);
      setAssistantResponse(aiResponse.replyText);

      // 1. Respuesta hablada inmediata y clara con ElevenLabs
      await ElevenLabsService.speakText(aiResponse.replyText);

      // 2. Si es conversación casual
      if (aiResponse.type === 'conversation') {
        setVoiceStatus('Conversación activa');
        return;
      }

      // 2.1 Si es una CONSULTA o BÚSQUEDA de historial/ideas/tareas/enlaces
      if (aiResponse.type === 'query') {
        setVoiceStatus('Respuesta a tu consulta');
        if (aiResponse.queryFilter) {
          if (aiResponse.queryFilter.section && aiResponse.queryFilter.section !== 'all') {
            setActiveSectionTab(aiResponse.queryFilter.section);
          }
          if (aiResponse.queryFilter.targetCategory) {
            setSelectedCategory(aiResponse.queryFilter.targetCategory);
          }
          if (aiResponse.queryFilter.searchTerm) {
            setSearchQuery(aiResponse.queryFilter.searchTerm);
          }
        }
        return;
      }

      // 3. Manejo interactivo de Tareas de Blue.app
      if (aiResponse.type === 'task' && aiResponse.extractedTask) {
        const mergedDraft: TaskDraft = {
          ...(activeTaskDraft || {}),
          ...aiResponse.extractedTask,
        };

        // Si hay sospecha de duplicado semántico o faltan datos, mantenemos el borrador activo y esperamos aclaración del usuario
        if (aiResponse.isTaskComplete === false || aiResponse.isPotentialDuplicate === true) {
          setActiveTaskDraft(mergedDraft);
          if (aiResponse.isPotentialDuplicate) {
            setVoiceStatus(`⚠️ Posible duplicado detectado - esperando aclaración`);
          } else {
            setVoiceStatus(`⏳ Completando ficha de tarea...`);
          }
          return;
        }

        // Tarea Completa al 100% -> Publicar en Blue.app
        setActiveTaskDraft(null);
        setVoiceStatus(`✓ Tarea creada para ${mergedDraft.assignedToName || 'el equipo'}`);

        const targetWorkspace = mergedDraft.workspaceId || projects[0]?.id || 'app-xprinta';
        const targetUserId = mergedDraft.assignedUserId;

        const categoryToUse = aiResponse.suggestedCategory || mergedDraft.category || 'General';
        const rawTags = (mergedDraft.tags && mergedDraft.tags.length > 0) ? mergedDraft.tags : [categoryToUse];

        await BlueAppService.createTask({
          title: mergedDraft.title || speechText.slice(0, 45),
          description: mergedDraft.description || speechText,
          projectId: targetWorkspace,
          columnId: mergedDraft.columnId,
          assigneeIds: targetUserId ? [targetUserId] : undefined,
          tags: rawTags.map(t => ({
            title: t || 'General',
            color: '#F18108'
          })),
        });

        // Guardar también en el historial local
        const newIdea: IdeaItem = {
          id: Date.now().toString(),
          title: mergedDraft.title || speechText.slice(0, 45),
          content: `${mergedDraft.description || speechText}

• Responsable: ${mergedDraft.assignedToName || 'Equipo'}
• Workspace: ${mergedDraft.workspaceName || 'Xprinta'}
• Columna Kanban: ${mergedDraft.columnName || 'General'}
• Plazo: ${mergedDraft.dueDateText || 'Sin fecha'}`,
          category: categoryToUse,
          type: 'task',
          tags: [`Tarea (${mergedDraft.assignedToName || 'Equipo'})`, categoryToUse, 'Blue.app'],
          createdAt: new Date().toISOString(),
          syncedWithBlueApp: true,
        };
        const updated = await StorageService.saveIdea(newIdea, currentUser?.id);
        setIdeas(updated);
        return;
      }

      // 4. Si es idea o referencia de link
      const isLinkMode = aiResponse.type === 'link';
      const categoryToUse = aiResponse.suggestedCategory || 'General';
      setVoiceStatus(aiResponse.extractedTitle ? `✓ ${categoryToUse}` : '');

      const newIdea: IdeaItem = {
        id: Date.now().toString(),
        title: aiResponse.extractedTitle || speechText.slice(0, 45),
        content: speechText,
        category: categoryToUse,
        type: isLinkMode ? 'link' : 'voice_memo',
        url: aiResponse.extractedUrl || (isLinkMode ? speechText : undefined),
        tags: [
          isLinkMode ? 'Referencia Redes' : 'Idea',
          categoryToUse,
          'Voz'
        ],
        createdAt: new Date().toISOString(),
      };

      const updated = await StorageService.saveIdea(newIdea, currentUser?.id);
      setIdeas(updated);
    } catch (err) {
      setIsProcessingAI(false);
      setVoiceStatus('Toca para hablar');
    }
  };

  const triggerVoiceInteraction = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    if (!isListening) {
      setIsListening(true);
      setLiveTranscript('');
      setVoiceStatus('Te escucho...');
      setAssistantResponse('');

      Animated.loop(
        Animated.sequence([
          Animated.timing(frequencyPulse, {
            toValue: 1.45,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(frequencyPulse, {
            toValue: 0.85,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      ).start();

      const started = await SpeechService.startListening(
        (text) => {
          if (text) {
            setLiveTranscript(text);
            setVoiceStatus(`"${text}"`);
          }
        },
        async (finalText) => {
          // Automatic voice activity completion when user stops talking
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await processUserVoiceQuery(finalText);
        }
      );

      if (!started) {
        setVoiceStatus('Toca para hablar');
        setIsListening(false);
      }
    } else {
      // Manual finish if user taps before auto silence
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const text = (await SpeechService.stopListening()) || liveTranscript;
      await processUserVoiceQuery(text);
    }
  };

  const handleSaveIdea = async () => {
    if (!newTitle.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const ideaCategory = (newCategory && newCategory.trim()) || (customCategoryInput && customCategoryInput.trim()) || 'General';
    const idea: IdeaItem = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
      category: ideaCategory,
      type: newUrl ? 'link' : 'observation',
      url: newUrl || undefined,
      tags: [ideaCategory, 'Xprinta'],
      createdAt: new Date().toISOString(),
    };

    const updated = await StorageService.saveIdea(idea, currentUser?.id);
    setIdeas(updated);
    setAddModalVisible(false);
    setNewTitle('');
    setNewContent('');
    setNewUrl('');
  };

    const handleTestNasConnection = async () => {
    setNasSyncing(true);
    setNasStatusMsg('Verificando enlace con WD My Cloud EX4100...');
    await NasSyncService.saveConfig({
      host: nasHost,
      port: nasPort,
      shareName: nasShare,
      username: nasUser,
      password: nasPassword,
      autoSync: true,
    });
    const res = await NasSyncService.testConnection();
    setNasSyncing(false);
    setNasStatusMsg(res.message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSyncDatasetToNas = async () => {
    setNasSyncing(true);
    setNasStatusMsg('Exportando dataset enriquecido para LLM...');
    const res = await NasSyncService.syncIdeasToNas(ideas, currentUser);
    setNasSyncing(false);
    setNasStatusMsg(`¡Dataset sincronizado! ${res.syncedCount} registros exportados a dataset-llm.jsonl`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddDictionaryTerm = async () => {
    if (!newDictTerm.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = await DictionaryService.addCustomTerm(selectedDictCatId, newDictTerm.trim());
    setTechnicalDictionary([...updated]);
    setNewDictTerm('');
  };

  const handleRemoveDictionaryTerm = async (catId: string, term: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await DictionaryService.removeTerm(catId, term);
    setTechnicalDictionary([...updated]);
  };

  const handleSaveSettings = async () => {
    await OpenRouterService.setApiKey(openRouterKey);
    await OpenRouterService.setModel(currentModel);
    if (elevenLabsKey.trim()) {
      await ElevenLabsService.setApiKey(elevenLabsKey.trim());
    }
    if (selectedVoiceId) {
      await ElevenLabsService.setVoiceId(selectedVoiceId);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSettingsVisible(false);
  };

  if (!fontsLoaded || authChecking) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // PANTALLA DE LOGIN CORPORATIVO SI NO ESTÁ AUTENTICADO
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={activeTheme.isDark ? "light-content" : "dark-content"} backgroundColor={activeTheme.bgApp} />
        <ScrollView contentContainerStyle={styles.loginContainer}>
          <View style={styles.loginBrandHeader}>
            <View style={styles.badgeProtected}>
              <ShieldCheck size={14} color={colors.primary} />
              <Text style={styles.badgeProtectedText}>EXCLUSIVO MIEMBROS XPRINTA</Text>
            </View>
            <Text style={styles.loginTitle}>
              Xprinta<Text style={styles.brandTitleAccent}>Pro</Text>
            </Text>
            <Text style={styles.loginSubtitle}>
              Acceso restringido. Inicia sesión con tus credenciales corporativas autorizadas.
            </Text>
          </View>

          <View style={styles.loginCard}>
            <Text style={styles.fieldLabel}>Correo Corporativo</Text>
            <View style={styles.inputWithIcon}>
              <Mail size={16} color={colors.n500} />
              <TextInput
                placeholder="usuario@xprinta.com"
                placeholderTextColor={colors.n600}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.textInputInside}
                value={loginEmail}
                onChangeText={setLoginEmail}
              />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Código PIN de Seguridad</Text>
            <View style={styles.inputWithIcon}>
              <KeyRound size={16} color={colors.n500} />
              <TextInput
                placeholder="PIN de 4 dígitos"
                placeholderTextColor={colors.n600}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
                style={styles.textInputInside}
                value={loginPin}
                onChangeText={setLoginPin}
              />
            </View>

            {loginError !== '' && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{loginError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => handleLogin()}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Validar Credencial Corporativa</Text>
              )}
            </TouchableOpacity>
          </View>


        </ScrollView>
      </SafeAreaView>
    );
  }

  // PANTALLA PRINCIPAL CON ENJAMBRE CUÁNTICO
  const rotateClockwise = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotateCounterClockwise = counterRotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const rotateInnerFast = innerSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Categorías 100% dinámicas extraídas del contenido real del usuario
  const userCategories: string[] = ['Todos', ...Array.from(new Set(ideas.map(i => i.category).filter(Boolean)))];

  const filteredIdeas = ideas.filter(item => {
    // 1. Filtro por sección activa (Ideas, Tareas, Enlaces)
    let matchesSection = false;
    if (activeSectionTab === 'ideas') {
      matchesSection = item.type !== 'task' && item.type !== 'link';
    } else if (activeSectionTab === 'tasks') {
      matchesSection = item.type === 'task';
    } else if (activeSectionTab === 'links') {
      matchesSection = item.type === 'link' || !!item.url;
    }

    // 2. Filtro por categoría y búsqueda
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesCategory && matchesSearch;
  });

  const ideasCount = ideas.filter(i => i.type !== 'task' && i.type !== 'link').length;
  const tasksCount = ideas.filter(i => i.type === 'task').length;
  const linksCount = ideas.filter(i => i.type === 'link' || !!i.url).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={activeTheme.isDark ? "light-content" : "dark-content"} backgroundColor={activeTheme.bgApp} />

      {/* Header Minimalista & Modelo de IA */}
      <View style={styles.header}>
        <View>
          <View style={styles.aiBadgeRow}>
            <Cpu size={12} color={colors.primary} />
            <Text style={styles.eyebrow}>
              {OPENROUTER_MODELS.find(m => m.id === currentModel)?.name || 'OpenRouter AI'}
            </Text>
          </View>
          <Text style={styles.brandTitle}>
            Xprinta<Text style={styles.brandTitleAccent}>Pro</Text>
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>{currentUser.name.split(' ')[0]}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsIconBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSettingsVisible(true);
            }}
          >
            <Sliders size={18} color={colors.n400} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas Cuántico Vivo y Dinámico */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={triggerVoiceInteraction}
        style={styles.quantumStage}
      >
        {/* Capa 1: Enjambre Exterior Rotatorio Horario */}
        <Animated.View
          style={[
            styles.swarmContainer,
            {
              transform: [
                { rotate: rotateClockwise },
                { scale: Animated.multiply(idlePulseAnim, frequencyPulse) }
              ]
            }
          ]}
        >
          {particleField.slice(0, 240).map(p => (
            <View
              key={p.id}
              style={[
                styles.miniParticle,
                {
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size / 2,
                  backgroundColor: isListening ? '#FFFFFF' : p.color,
                  opacity: isListening ? 0.95 : p.opacity,
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                  ],
                  shadowColor: p.color,
                  shadowOpacity: isListening ? 0.9 : 0.35,
                  shadowRadius: isListening ? 4 : 1.5,
                }
              ]}
            />
          ))}
        </Animated.View>

        {/* Capa 2: Enjambre Exterior Contra-Rotatorio */}
        <Animated.View
          style={[
            styles.swarmContainer,
            {
              transform: [
                { rotate: rotateCounterClockwise },
                { scale: isListening ? frequencyPulse : idlePulseAnim }
              ]
            }
          ]}
        >
          {particleField.slice(240, 400).map(p => (
            <View
              key={p.id}
              style={[
                styles.miniParticle,
                {
                  width: p.size * (isListening ? 1.3 : 1),
                  height: p.size * (isListening ? 1.3 : 1),
                  borderRadius: p.size / 2,
                  backgroundColor: isListening ? '#FFBA6B' : p.color,
                  opacity: isListening ? 0.9 : p.opacity,
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                  ],
                }
              ]}
            />
          ))}
        </Animated.View>

        {/* Capa 3: Micro-partículas densas dentro del Núcleo Activo */}
        <Animated.View
          style={[
            styles.coreSwarmContainer,
            {
              transform: [
                { rotate: rotateInnerFast },
                { scale: idlePulseAnim }
              ]
            }
          ]}
        >
          {particleField.slice(400, 480).map(p => (
            <View
              key={p.id}
              style={[
                styles.miniParticle,
                {
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size / 2,
                  backgroundColor: isListening ? '#FFFFFF' : p.color,
                  opacity: 0.95,
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                  ],
                  shadowColor: '#FFFFFF',
                  shadowOpacity: 0.8,
                  shadowRadius: 3,
                }
              ]}
            />
          ))}
        </Animated.View>

        {/* Halo de luz respiratorio perimetral */}
        <Animated.View
          style={[
            styles.quantumAuraRing,
            {
              transform: [{ scale: Animated.multiply(idlePulseAnim, isListening ? frequencyPulse : 1) }],
              opacity: coreGlowAnim,
            }
          ]}
        />

        {/* Núcleo de Plasma Cuántico Central */}
        <Animated.View
          style={[
            styles.quantumCore,
            {
              transform: [
                { scale: Animated.multiply(idlePulseAnim, isListening ? frequencyPulse : 1) }
              ],
              borderColor: isListening ? '#FFFFFF' : colors.primary,
              backgroundColor: isListening ? 'rgba(241, 129, 8, 0.35)' : 'rgba(241, 129, 8, 0.15)'
            }
          ]}
        >
          {/* Anillo de cristal interno */}
          <View style={styles.coreInnerRing} />
          {/* Orbe de energía viva central */}
          <Animated.View style={[styles.coreEnergyOrb, { opacity: coreGlowAnim }]} />
          <View style={styles.coreCenterDot} />
        </Animated.View>

        <View style={styles.statusBox}>
          {isProcessingAI ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.statusText}>{voiceStatus}</Text>
            </View>
          ) : (
            voiceStatus ? <Text style={styles.statusText}>{voiceStatus}</Text> : null
          )}

          {assistantResponse !== '' && (
            <View style={styles.responseBubble}>
              <Text style={styles.responseText}>{assistantResponse}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Barra Inferior */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.pillButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIdeasModalVisible(true);
          }}
        >
          <Bookmark size={16} color={colors.primary} />
          <Text style={styles.pillButtonText}>Repositorio ({ideas.length})</Text>
          <ChevronUp size={14} color={colors.n400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCircleBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAddModalVisible(true);
          }}
        >
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Modal Repositorio */}
      <Modal visible={ideasModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandleBar}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.eyebrow}>XPRINTA WORKSPACE</Text>
                <Text style={styles.sheetTitle} numberOfLines={1}>Repositorio</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtnCircle}
                onPress={() => setIdeasModalVisible(false)}
              >
                <X size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* 3 APARTADOS PRINCIPALES: IDEAS | TAREAS | ENLACES */}
            <View style={styles.sectionTabsRow}>
              <TouchableOpacity
                style={[styles.sectionTabBtn, activeSectionTab === 'ideas' && styles.sectionTabBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveSectionTab('ideas');
                }}
              >
                <Bookmark size={14} color={activeSectionTab === 'ideas' ? colors.white : activeTheme.textSecondary} />
                <Text style={[styles.sectionTabText, activeSectionTab === 'ideas' && styles.sectionTabTextActive]}>
                  Ideas ({ideasCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sectionTabBtn, activeSectionTab === 'tasks' && styles.sectionTabBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveSectionTab('tasks');
                }}
              >
                <FolderKanban size={14} color={activeSectionTab === 'tasks' ? colors.white : activeTheme.textSecondary} />
                <Text style={[styles.sectionTabText, activeSectionTab === 'tasks' && styles.sectionTabTextActive]}>
                  Tareas ({tasksCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sectionTabBtn, activeSectionTab === 'links' && styles.sectionTabBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveSectionTab('links');
                }}
              >
                <ExternalLink size={14} color={activeSectionTab === 'links' ? colors.white : activeTheme.textSecondary} />
                <Text style={[styles.sectionTabText, activeSectionTab === 'links' && styles.sectionTabTextActive]}>
                  Enlaces ({linksCount})
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Search size={15} color={colors.n400} />
              <TextInput
                placeholder="Buscar en el repositorio..."
                placeholderTextColor={colors.n500}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {userCategories.length > 1 && (
              <View style={{ height: 42, marginBottom: 14 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRowContent}>
                  {userCategories.map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setSelectedCategory(c)}
                      style={[styles.catChip, selectedCategory === c && styles.catChipActive]}
                    >
                      <Text style={[styles.catChipText, selectedCategory === c && styles.catChipTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.sheetScroll}>
              {filteredIdeas.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Bookmark size={32} color={colors.n600} style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyStateTitle}>Sin notas en esta categoría</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Dicta una nueva idea o requerimiento por voz para empezar a registrar tu repositorio.
                  </Text>
                </View>
              ) : (
                filteredIdeas.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.ideaCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDetailItem(item);
                    }}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{item.category}</Text>
                      </View>
                      <Text style={styles.cardDate}>
                        {new Date(item.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardContent} numberOfLines={2}>{item.content}</Text>
                    
                    {item.url && (
                      <TouchableOpacity
                        style={styles.linkRow}
                        onPress={() => Linking.openURL(item.url!)}
                      >
                        <ExternalLink size={12} color={colors.primary} />
                        <Text style={styles.linkRowText} numberOfLines={1}>{item.url}</Text>
                      </TouchableOpacity>
                    )}
                    
                    <View style={styles.cardBottom}>
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                        {item.tags.map(t => (
                          <Text key={t} style={styles.tagLabel}>#{t}</Text>
                        ))}
                      </View>

                      {item.type !== 'task' ? (
                        <TouchableOpacity
                          onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            BlueAppService.createTask({
                              title: item.title,
                              description: item.content,
                              projectId: projects[0]?.id || 'app-xprinta'
                            });
                          }}
                          style={styles.blueBtn}
                        >
                          <FolderKanban size={12} color={colors.primary} />
                          <Text style={styles.blueBtnText}>Convertir a Tarea</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.taskBadge}>
                          <FolderKanban size={11} color="#34C759" />
                          <Text style={styles.taskBadgeText}>En Blue.app</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

            {/* Modal Detalle Completo de Idea / Tarea / Enlace */}
      <Modal visible={!!selectedDetailItem} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheetContainer, { maxHeight: SCREEN_HEIGHT * 0.85 }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{selectedDetailItem?.category || 'General'}</Text>
                    </View>
                    {selectedDetailItem?.type === 'task' && (
                      <View style={styles.taskBadge}>
                        <FolderKanban size={11} color="#34C759" />
                        <Text style={styles.taskBadgeText}>Tarea Blue.app</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sheetTitle} numberOfLines={2}>{selectedDetailItem?.title}</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtnCircle}
                  onPress={() => setSelectedDetailItem(null)}
                >
                  <X size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.detailDateText}>
                Registrado el {selectedDetailItem ? new Date(selectedDetailItem.createdAt).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              </Text>

              <Text style={styles.fieldLabel}>Contenido / Especificaciones</Text>
              <View style={styles.detailContentBox}>
                <Text style={styles.detailContentText}>{selectedDetailItem?.content}</Text>
              </View>

              {selectedDetailItem?.url && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.fieldLabel}>Enlace de Referencia</Text>
                  <TouchableOpacity
                    style={styles.detailLinkCard}
                    onPress={() => Linking.openURL(selectedDetailItem.url!)}
                  >
                    <ExternalLink size={16} color={colors.primary} />
                    <Text style={styles.detailLinkText}>{selectedDetailItem.url}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Etiquetas</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {selectedDetailItem?.tags.map(t => (
                  <View key={t} style={styles.detailTagPill}>
                    <Text style={styles.detailTagPillText}>#{t}</Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, marginBottom: 20 }}>
                {selectedDetailItem?.type !== 'task' && (
                  <TouchableOpacity
                    style={styles.detailBlueBtn}
                    onPress={() => {
                      if (selectedDetailItem) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        BlueAppService.createTask({
                          title: selectedDetailItem.title,
                          description: selectedDetailItem.content,
                          projectId: projects[0]?.id || 'app-xprinta'
                        });
                        setSelectedDetailItem(null);
                      }
                    }}
                  >
                    <FolderKanban size={16} color={colors.white} />
                    <Text style={styles.detailBlueBtnText}>Enviar a Blue.app</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.detailDeleteBtn}
                  onPress={async () => {
                    if (selectedDetailItem) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      const updated = await StorageService.deleteIdea(selectedDetailItem.id, currentUser?.id);
                      setIdeas(updated);
                      setSelectedDetailItem(null);
                    }
                  }}
                >
                  <Trash2 size={16} color={colors.error} />
                  <Text style={styles.detailDeleteBtnText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Añadir Nota */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { flex: 1, marginRight: 12 }]} numberOfLines={1}>Nueva Nota / Enlace</Text>
              <TouchableOpacity
                style={styles.closeBtnCircle}
                onPress={() => setAddModalVisible(false)}
              >
                <X size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Título</Text>
            <TextInput
              placeholder="Ej: Rótulo de marquesina con iluminación LED"
              placeholderTextColor={colors.n500}
              style={styles.fieldInput}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.fieldLabel}>Categoría</Text>
              <TouchableOpacity onPress={() => setIsAddingNewCat(!isAddingNewCat)}>
                <Text style={{ color: colors.primary, fontSize: 12, fontFamily: typography.fontSans.semiBold }}>
                  {isAddingNewCat ? 'Ver existentes' : '+ Nueva Categoría'}
                </Text>
              </TouchableOpacity>
            </View>

            {isAddingNewCat ? (
              <TextInput
                placeholder="Nombre de la nueva categoría..."
                placeholderTextColor={colors.n500}
                style={[styles.fieldInput, { marginBottom: 12 }]}
                value={customCategoryInput}
                onChangeText={(val) => {
                  setCustomCategoryInput(val);
                  setNewCategory(val);
                }}
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {userCategories.filter(c => c !== 'Todos').map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setNewCategory(c)}
                    style={[styles.catChip, newCategory === c && styles.catChipActive]}
                  >
                    <Text style={[styles.catChipText, newCategory === c && styles.catChipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.fieldLabel}>Enlace Externo (Instagram, Web...)</Text>
            <TextInput
              placeholder="https://..."
              placeholderTextColor={colors.n500}
              style={styles.fieldInput}
              value={newUrl}
              onChangeText={setNewUrl}
            />

            <Text style={styles.fieldLabel}>Descripción u Observaciones</Text>
            <TextInput
              placeholder="Detalles sobre materiales, colores, cliente..."
              placeholderTextColor={colors.n500}
              multiline
              numberOfLines={3}
              style={[styles.fieldInput, { height: 70, textAlignVertical: 'top' }]}
              value={newContent}
              onChangeText={setNewContent}
            />

            <TouchableOpacity style={styles.primaryActionBtn} onPress={handleSaveIdea}>
              <Text style={styles.primaryActionBtnText}>Guardar en el Asistente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Ajustes y Perfil */}
      <Modal visible={settingsVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheetContainer, { maxHeight: SCREEN_HEIGHT * 0.9 }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { flex: 1, marginRight: 12 }]} numberOfLines={1}>Perfil Corporativo & IA</Text>
              <TouchableOpacity
                style={styles.closeBtnCircle}
                onPress={() => setSettingsVisible(false)}
              >
                <X size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileBoxName}>{currentUser.name}</Text>
                <Text style={styles.profileBoxRole}>{currentUser.role}</Text>
                <Text style={styles.profileBoxEmail}>{currentUser.email}</Text>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut size={16} color="#FF4D4D" />
                <Text style={styles.logoutText}>Salir</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Modelo OpenRouter</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {OPENROUTER_MODELS.map(m => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setCurrentModel(m.id)}
                  style={[styles.catChip, currentModel === m.id && styles.catChipActive]}
                >
                  <Text style={[styles.catChipText, currentModel === m.id && styles.catChipTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* SECCIÓN VOZ HYPER-HUMANA ELEVENLABS (CATÁLOGO DE VOCES) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, marginTop: 4 }}>
              <Volume2 size={15} color={colors.primary} />
              <Text style={styles.fieldLabel}>Selección de Voz Oficial de la IA</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {ELEVENLABS_VOICES.map(v => (
                <TouchableOpacity
                  key={v.id}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedVoiceId(v.id);
                    await ElevenLabsService.setVoiceId(v.id);
                  }}
                  style={[
                    styles.themeOptionBtn,
                    { minWidth: '30%', flex: 1, paddingVertical: 10, paddingHorizontal: 6 },
                    selectedVoiceId === v.id && styles.themeOptionBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      { fontWeight: '700', fontSize: 12.5, textAlign: 'center' },
                      selectedVoiceId === v.id && styles.themeOptionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {v.gender === 'male' ? '🧔 ' : '👩 '}{v.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { fontSize: 12.5 }]}>API Key de ElevenLabs</Text>
            <TextInput
              placeholder="sk_..."
              placeholderTextColor={colors.n500}
              style={styles.fieldInput}
              value={elevenLabsKey}
              onChangeText={setElevenLabsKey}
              secureTextEntry
            />

            {/* SECCIÓN APARIENCIA / TEMA (LIGHT DEFAULT | DARK | AUTO) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 }}>
              <Sun size={15} color={colors.primary} />
              <Text style={styles.fieldLabel}>Tema de la Aplicación</Text>
            </View>
            <View style={styles.themeSelectorRow}>
              <TouchableOpacity
                style={[styles.themeOptionBtn, themePref === 'light' && styles.themeOptionBtnActive]}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setThemePref('light');
                  await ThemeService.setThemePreference('light');
                }}
              >
                <Sun size={15} color={themePref === 'light' ? colors.white : activeTheme.textSecondary} />
                <Text style={[styles.themeOptionText, themePref === 'light' && styles.themeOptionTextActive]}>
                  Claro (Defecto)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.themeOptionBtn, themePref === 'dark' && styles.themeOptionBtnActive]}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setThemePref('dark');
                  await ThemeService.setThemePreference('dark');
                }}
              >
                <Moon size={15} color={themePref === 'dark' ? colors.white : activeTheme.textSecondary} />
                <Text style={[styles.themeOptionText, themePref === 'dark' && styles.themeOptionTextActive]}>
                  Oscuro
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.themeOptionBtn, themePref === 'auto' && styles.themeOptionBtnActive]}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setThemePref('auto');
                  await ThemeService.setThemePreference('auto');
                }}
              >
                <Smartphone size={15} color={themePref === 'auto' ? colors.white : activeTheme.textSecondary} />
                <Text style={[styles.themeOptionText, themePref === 'auto' && styles.themeOptionTextActive]}>
                  Auto
                </Text>
              </TouchableOpacity>
            </View>


            {/* SECCIÓN DICCIONARIO TÉCNICO Y GLOSARIO XPRINTA (REDESIGN PREMIUM & ESPACIADO) */}
            <View style={{ marginTop: 18, marginBottom: 16, borderRadius: 16, backgroundColor: activeTheme.bgCard, borderWidth: 1, borderColor: activeTheme.borderSubtle, overflow: 'hidden' }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDictExpanded(!dictExpanded);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(241, 129, 8, 0.12)', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: activeTheme.textPrimary }}>Glosario & Diccionario</Text>
                    <Text style={{ fontSize: 12, color: activeTheme.textSecondary, marginTop: 1 }}>
                      {technicalDictionary.reduce((acc, c) => acc + c.terms.length, 0)} términos técnicos activos
                    </Text>
                  </View>
                </View>
                {dictExpanded ? (
                  <ChevronUp size={20} color={colors.primary} />
                ) : (
                  <ChevronDown size={20} color={activeTheme.textSecondary} />
                )}
              </TouchableOpacity>

              {dictExpanded && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: activeTheme.borderSubtle }}>
                  <Text style={{ fontSize: 12.5, color: activeTheme.textSecondary, marginVertical: 10, lineHeight: 18 }}>
                    Términos y jerga industrial inyectados automáticamente para sesgo fonético en el micrófono y comprensión semántica de la IA.
                  </Text>

                  {/* Selector de Categorías con scroll fluido */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {technicalDictionary.map(cat => (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedDictCatId(cat.id);
                          }}
                          style={[
                            styles.catChip,
                            selectedDictCatId === cat.id && styles.catChipActive,
                            { paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 0 }
                          ]}
                        >
                          <Text style={[styles.catChipText, selectedDictCatId === cat.id && styles.catChipTextActive, { fontSize: 12 }]}>
                            {cat.name} ({cat.terms.length})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Input para agregar término */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <TextInput
                      placeholder="Nuevo término, máquina o persona..."
                      placeholderTextColor={colors.n500}
                      style={[styles.fieldInput, { flex: 1, marginBottom: 0, fontSize: 13, height: 42 }]}
                      value={newDictTerm}
                      onChangeText={setNewDictTerm}
                    />
                    <TouchableOpacity
                      style={[styles.btnSecondary, { paddingHorizontal: 14, height: 42, justifyContent: 'center', alignItems: 'center' }]}
                      onPress={handleAddDictionaryTerm}
                    >
                      <Plus size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Lista de Términos en badges limpios */}
                  <View style={{ maxHeight: 150, borderRadius: 12, backgroundColor: activeTheme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', padding: 8 }}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {(technicalDictionary.find(c => c.id === selectedDictCatId)?.terms || []).map(term => (
                          <View
                            key={term}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 5,
                              paddingHorizontal: 10,
                              borderRadius: 10,
                              backgroundColor: activeTheme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
                              borderWidth: 1,
                              borderColor: activeTheme.borderSubtle,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: activeTheme.textPrimary, fontWeight: '500' }}>{term}</Text>
                            <TouchableOpacity
                              onPress={() => handleRemoveDictionaryTerm(selectedDictCatId, term)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={{ marginLeft: 6 }}
                            >
                              <X size={12} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
            {/* SECCIÓN NAS WD MY CLOUD EX4100 (DATASET LLM) */}
            <View style={styles.nasHeaderBox}>
              <Database size={16} color={colors.primary} />
              <Text style={styles.nasHeaderTitle}>WD My Cloud EX4100 (Data Lake LLM)</Text>
            </View>

            <Text style={styles.fieldLabel}>Host / IP del NAS</Text>
            <TextInput
              placeholder="http://10.254.80.28"
              placeholderTextColor={colors.n500}
              style={styles.fieldInput}
              value={nasHost}
              onChangeText={setNasHost}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Puerto</Text>
                <TextInput
                  placeholder="80 / 443"
                  placeholderTextColor={colors.n500}
                  style={styles.fieldInput}
                  value={nasPort}
                  onChangeText={setNasPort}
                />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={styles.fieldLabel}>Carpeta Compartida</Text>
                <TextInput
                  placeholder="Public/Xprinta-Brain"
                  placeholderTextColor={colors.n500}
                  style={styles.fieldInput}
                  value={nasShare}
                  onChangeText={setNasShare}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={handleTestNasConnection}
                disabled={nasSyncing}
              >
                <Text style={styles.btnSecondaryText}>Test Conexión NAS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSyncNas}
                onPress={handleSyncDatasetToNas}
                disabled={nasSyncing}
              >
                <Database size={13} color={colors.white} />
                <Text style={styles.btnSyncNasText}>Sincronizar Dataset</Text>
              </TouchableOpacity>
            </View>

            {nasStatusMsg !== '' && (
              <View style={styles.nasStatusCard}>
                <Text style={styles.nasStatusText}>{nasStatusMsg}</Text>
              </View>
            )}

            <View style={{ height: 16 }} />

            <TouchableOpacity style={styles.primaryActionBtn} onPress={handleSaveSettings}>
              <Text style={styles.primaryActionBtnText}>Guardar Parámetros</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgApp,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 0,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginContainer: {
    padding: spacing.xl,
    paddingTop: 30,
    flexGrow: 1,
    justifyContent: 'center',
  },
  loginBrandHeader: {
    marginBottom: spacing.xl,
  },
  badgeProtected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(241, 129, 8, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(241, 129, 8, 0.3)',
  },
  badgeProtectedText: {
    fontSize: 10,
    fontFamily: typography.fontSans.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
  loginTitle: {
    fontSize: 34,
    fontFamily: typography.fontSans.light,
    color: theme.textPrimary,
    letterSpacing: -0.5,
  },
  loginSubtitle: {
    fontSize: typography.sizes.bodySm,
    color: theme.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  loginCard: {
    backgroundColor: theme.sheetBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
    marginBottom: spacing.xl,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgInput,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
    height: 48,
  },
  textInputInside: {
    flex: 1,
    marginLeft: 10,
    color: theme.textPrimary,
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 77, 77, 0.15)',
    padding: 10,
    borderRadius: radius.sm,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.3)',
  },
  errorBannerText: {
    color: '#FF7070',
    fontSize: 12,
    fontFamily: typography.fontSans.medium,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: 18,
  },
  loginButtonText: {
    color: colors.white,
    fontFamily: typography.fontSans.bold,
    fontSize: 14,
  },
  membersDirectory: {
    marginTop: 10,
  },
  directoryTitle: {
    fontSize: 11,
    fontFamily: typography.fontSans.semiBold,
    color: theme.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0E0E',
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    gap: 12,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(241, 129, 8, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  memberAvatarText: {
    color: colors.primary,
    fontFamily: typography.fontSans.bold,
    fontSize: 12,
  },
  memberName: {
    color: theme.textPrimary,
    fontFamily: typography.fontSans.semiBold,
    fontSize: 13,
  },
  memberRole: {
    color: theme.textMuted,
    fontSize: 11,
  },
  pinPill: {
    backgroundColor: theme.bgInput,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  pinPillText: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: typography.fontSans.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: typography.fontSans.semiBold,
    letterSpacing: 1.2,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  brandTitle: {
    fontSize: typography.sizes.h2,
    fontFamily: typography.fontSans.light,
    color: theme.textPrimary,
    letterSpacing: -0.5,
  },
  brandTitleAccent: {
    fontFamily: typography.fontSerif.italic,
    color: colors.primary,
  },
  userBadge: {
    backgroundColor: theme.bgInput,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
  },
  userBadgeText: {
    color: colors.primary,
    fontFamily: typography.fontSans.semiBold,
    fontSize: 12,
  },
  settingsIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: theme.glassPillBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.glassPillBorder,
    shadowColor: theme.isDark ? '#000' : '#8A99AD',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.isDark ? 0.3 : 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  quantumStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  swarmContainer: {
    position: 'absolute',
    width: 340,
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniParticle: {
    position: 'absolute',
  },
  coreSwarmContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantumAuraRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(241, 129, 8, 0.4)',
    backgroundColor: 'rgba(241, 129, 8, 0.08)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  quantumCore: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 16,
    elevation: 8,
  },
  coreInnerRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  coreEnergyOrb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  coreCenterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  statusBox: {
    position: 'absolute',
    bottom: 24,
    width: SCREEN_WIDTH - 32,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  statusText: {
    fontSize: 17,
    lineHeight: 25,
    fontFamily: typography.fontSans.medium,
    color: colors.n300,
    textAlign: 'center',
    maxWidth: '100%',
  },
  responseBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.statusBubbleBg,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: theme.isDark ? 'rgba(241, 129, 8, 0.4)' : 'rgba(241, 129, 8, 0.25)',
    width: '100%',
    shadowColor: theme.isDark ? '#000' : colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: theme.isDark ? 0.5 : 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  responseText: {
    color: theme.textPrimary,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: typography.fontSans.regular,
    textAlign: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 20,
    paddingTop: 8,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.glassPillBg,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: theme.glassPillBorder,
    gap: 8,
    shadowColor: theme.isDark ? '#000' : '#8A99AD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme.isDark ? 0.4 : 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  pillButtonText: {
    color: theme.textPrimary,
    fontFamily: typography.fontSans.semiBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  actionCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.glassFabBorder,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.isDark ? 'rgba(0,0,0,0.82)' : 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    backgroundColor: theme.glassSheetBg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 18,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    height: SCREEN_HEIGHT * 0.85,
    width: '100%',
    maxWidth: SCREEN_WIDTH,
    borderTopWidth: 1.5,
    borderColor: theme.glassSheetBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: theme.isDark ? 0.5 : 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  sheetHandleBar: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333333',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    width: '100%',
  },
  sheetTitle: {
    fontSize: 24,
    fontFamily: typography.fontSans.medium,
    color: theme.textPrimary,
  },
  closeBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.isDark ? 'rgba(241, 129, 8, 0.15)' : 'rgba(241, 129, 8, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.isDark ? 'rgba(241, 129, 8, 0.35)' : 'rgba(241, 129, 8, 0.25)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
  },
  profileBoxName: {
    color: theme.textPrimary,
    fontFamily: typography.fontSans.semiBold,
    fontSize: 14,
  },
  profileBoxRole: {
    color: colors.primary,
    fontSize: 12,
    marginTop: 2,
  },
  profileBoxEmail: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 77, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 4,
  },
  logoutText: {
    color: '#FF4D4D',
    fontSize: 12,
    fontFamily: typography.fontSans.medium,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgInput,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
    height: 40,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: theme.textPrimary,
    fontFamily: typography.fontSans.regular,
    fontSize: 13,
  },
  chipRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  catChip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.bgInput,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    color: theme.textSecondary,
    fontSize: 15,
    fontFamily: typography.fontSans.semiBold,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    color: colors.n600,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: typography.fontSans.regular,
    textAlign: 'center',
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontFamily: typography.fontSans.medium,
  },
  catChipTextActive: {
    color: colors.white,
    fontFamily: typography.fontSans.bold,
  },
  sheetScroll: {
    paddingBottom: 24,
  },
  ideaCard: {
    backgroundColor: theme.glassCardBg,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.glassCardBorder,
    shadowColor: theme.isDark ? '#000' : '#B0BAC9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: colors.primaryHover,
    fontSize: 12,
    fontFamily: typography.fontSans.semiBold,
  },
  cardDate: {
    color: theme.textMuted,
    fontSize: 10,
  },
  cardTitle: {
    color: theme.textPrimary,
    fontSize: 17,
    fontFamily: typography.fontSans.semiBold,
    marginBottom: 4,
  },
  cardContent: {
    color: theme.textSecondary,
    fontSize: 14.5,
    lineHeight: 20,
    marginBottom: 6,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgInput,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginBottom: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
  },
  linkRowText: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: typography.fontSans.medium,
    flex: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.borderSubtle,
    paddingTop: 8,
  },
  tagLabel: {
    color: theme.textMuted,
    fontSize: 10,
  },
  blueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  blueBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: typography.fontSans.medium,
  },
  fieldLabel: {
    color: theme.textSecondary,
    fontSize: 13.5,
    fontFamily: typography.fontSans.semiBold,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: theme.bgInput,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    color: theme.textPrimary,
    marginBottom: spacing.xs,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  nasHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  nasHeaderTitle: {
    color: theme.textPrimary,
    fontFamily: typography.fontSans.semiBold,
    fontSize: 13,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: theme.chipBg,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  btnSecondaryText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontFamily: typography.fontSans.medium,
  },
  btnSyncNas: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.sm,
    gap: 6,
  },
  sectionTabsRow: {
    flexDirection: 'row',
    backgroundColor: theme.bgInput,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
    gap: 4,
  },
  sectionTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm,
    gap: 6,
  },
  sectionTabBtnActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTabText: {
    fontSize: 14.5,
    color: theme.textSecondary,
    fontFamily: typography.fontSans.medium,
  },
  sectionTabTextActive: {
    color: colors.white,
    fontFamily: typography.fontSans.bold,
  },
  taskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.25)',
  },
  taskBadgeText: {
    color: '#34C759',
    fontSize: 10,
    fontFamily: typography.fontSans.bold,
  },
  detailDateText: {
    color: theme.textMuted,
    fontSize: 12,
    fontFamily: typography.fontSans.regular,
    marginBottom: 14,
  },
  detailContentBox: {
    backgroundColor: theme.bgInput,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
    marginTop: 4,
  },
  detailContentText: {
    color: theme.textPrimary,
    fontSize: 17,
    lineHeight: 25,
    fontFamily: typography.fontSans.regular,
  },
  detailLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primarySubtle,
    gap: 10,
  },
  detailLinkText: {
    color: colors.primary,
    fontSize: 13,
    fontFamily: typography.fontSans.medium,
    flex: 1,
  },
  detailTagPill: {
    backgroundColor: theme.bgInput,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
  },
  detailTagPillText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontFamily: typography.fontSans.medium,
  },
  btnSyncNasText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: typography.fontSans.bold,
  },
  nasStatusCard: {
    backgroundColor: theme.bgInput,
    padding: 10,
    borderRadius: radius.sm,
    marginTop: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  nasStatusText: {
    color: colors.n300,
    fontSize: 11,
  },
  detailBlueBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  detailBlueBtnText: {
    color: colors.white,
    fontFamily: typography.fontSans.bold,
    fontSize: 14.5,
    letterSpacing: -0.2,
  },
  detailDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1.5,
    borderColor: theme.isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.25)',
  },
  detailDeleteBtnText: {
    color: colors.error,
    fontFamily: typography.fontSans.bold,
    fontSize: 14.5,
  },
  primaryActionBtnText: {
    color: colors.white,
    fontFamily: typography.fontSans.bold,
    fontSize: 14,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: theme.bgInput,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
    gap: 4,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm,
    gap: 6,
  },
  themeOptionBtnActive: {
    backgroundColor: colors.primary,
  },
  themeOptionText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontFamily: typography.fontSans.medium,
  },
  themeOptionTextActive: {
    color: colors.white,
    fontFamily: typography.fontSans.bold,
  },
});
