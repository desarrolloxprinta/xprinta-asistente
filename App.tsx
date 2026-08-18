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
  Alert
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
  Database
} from 'lucide-react-native';

import { colors, typography, spacing, radius } from './src/theme/tokens';
import { IdeaItem, IdeaCategory, UserProfile } from './src/types';
import { StorageService } from './src/services/storage';
import { ElevenLabsService } from './src/services/elevenlabs';
import { BlueAppService } from './src/services/blueapp';
import { OpenRouterService } from './src/services/openrouter';
import { NasSyncService } from './src/services/nasSync';
import { AuthService, XPRINTA_AUTHORIZED_MEMBERS } from './src/services/auth';
import { SpeechService } from './src/services/speechService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CATEGORIES: IdeaCategory[] = ['Todos', 'Rótulos', 'Diseño', 'Comercial', 'Producción'];

const TOTAL_PARTICLES = 120;
const RINGS = [35, 60, 90, 125, 160];

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

  // Main state
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);

  // OpenRouter & ElevenLabs state
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [currentModel, setCurrentModel] = useState('openai/gpt-4o-mini');
  const [elevenLabsKey, setElevenLabsKey] = useState('');

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
  const [newCategory, setNewCategory] = useState<IdeaCategory>('Rótulos');
  const [newUrl, setNewUrl] = useState('');

  // Voice Interaction State
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('Toca el campo cuántico para hablar');
  const [assistantResponse, setAssistantResponse] = useState<string>('');

  // Animations
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const counterRotationAnim = useRef(new Animated.Value(0)).current;
  const frequencyPulse = useRef(new Animated.Value(1)).current;

  const particleField = useRef(
    Array.from({ length: TOTAL_PARTICLES }, (_, i) => {
      const ringIndex = i % RINGS.length;
      const baseRadius = RINGS[ringIndex];
      const countInRing = TOTAL_PARTICLES / RINGS.length;
      const angle = ((i % countInRing) / countInRing) * 2 * Math.PI + (ringIndex * 0.4);
      const size = (i % 5 === 0 ? 3.5 : (i % 3 === 0 ? 2.5 : 1.8));
      const opacity = 0.25 + (Math.random() * 0.7);
      
      return {
        id: i,
        baseRadius,
        angle,
        size,
        opacity,
        color: ringIndex === 0 
          ? '#FFFFFF' 
          : (ringIndex === 1 ? '#FFA336' : (ringIndex === 2 ? colors.primary : '#D97307')),
        x: Math.cos(angle) * baseRadius,
        y: Math.sin(angle) * baseRadius,
      };
    })
  ).current;

  useEffect(() => {
    checkAuthentication();
    startParticleEngine();
  }, []);

  const checkAuthentication = async () => {
    setAuthChecking(true);
    const user = await AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      await loadInitialData();
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
      await loadInitialData();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoginError(result.error || 'Credenciales no autorizadas.');
    }
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AuthService.logout();
    setCurrentUser(null);
    setSettingsVisible(false);
  };

  const loadInitialData = async () => {
    const loadedIdeas = await StorageService.getIdeas();
    const loadedProjects = await BlueAppService.getProjects();
    const key = await OpenRouterService.getApiKey();
    const model = await OpenRouterService.getModel();
    
    setIdeas(loadedIdeas);
    setProjects(loadedProjects);
    setOpenRouterKey(key);
    setCurrentModel(model);
  };

  const startParticleEngine = () => {
    Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 32000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(counterRotationAnim, {
        toValue: 1,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const triggerVoiceInteraction = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    if (!isListening) {
      setIsListening(true);
      setLiveTranscript('');
      setVoiceStatus('Escuchando tu voz... Habla ahora');
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

      const started = await SpeechService.startListening((text) => {
        if (text) {
          setLiveTranscript(text);
          setVoiceStatus(`"${text.slice(0, 35)}..."`);
        }
      });

      if (!started) {
        setVoiceStatus('Toca para hablar');
        setIsListening(false);
      }
    } else {
      // User tapped again to FINISH speaking
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsListening(false);
      setIsProcessingAI(true);
      setVoiceStatus('Procesando dictado con IA...');

      Animated.timing(frequencyPulse, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      const userText = (await SpeechService.stopListening()) || liveTranscript || 'Nueva idea para proyecto Xprinta';
      
      try {
        const aiResponse = await OpenRouterService.chatWithAssistant(userText);
        
        setIsProcessingAI(false);
        setAssistantResponse(aiResponse.replyText);
        setVoiceStatus('Listo');

        const newIdea: IdeaItem = {
          id: Date.now().toString(),
          title: aiResponse.extractedTitle,
          content: userText,
          category: aiResponse.suggestedCategory,
          type: 'voice_memo',
          tags: ['Voz', aiResponse.suggestedCategory, 'OpenRouter'],
          createdAt: new Date().toISOString(),
        };

        const updated = await StorageService.saveIdea(newIdea);
        setIdeas(updated);

        // Mirror to NAS
        // await NasSyncService.saveNoteToNas(newIdea);

        if (aiResponse.extractedTask) {
          await BlueAppService.createTask({
            title: aiResponse.extractedTask.title,
            description: aiResponse.extractedTask.description,
            projectId: projects[0]?.id || 'proj_01'
          });
        }

        // Voice playback
        await ElevenLabsService.speakText(aiResponse.replyText);
      } catch (err) {
        setIsProcessingAI(false);
        setVoiceStatus('Toca para hablar');
      }
    }
  };

  const handleSaveIdea = async () => {
    if (!newTitle.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const idea: IdeaItem = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
      category: newCategory,
      type: newUrl ? 'link' : 'observation',
      url: newUrl || undefined,
      tags: [newCategory, 'Xprinta'],
      createdAt: new Date().toISOString(),
    };

    const updated = await StorageService.saveIdea(idea);
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

  const handleSaveSettings = async () => {
    await OpenRouterService.setApiKey(openRouterKey);
    await OpenRouterService.setModel(currentModel);
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
        <StatusBar barStyle="light-content" backgroundColor="#050505" />
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

          {/* Acceso Rápido a Miembros Autorizados */}
          <View style={styles.membersDirectory}>
            <Text style={styles.directoryTitle}>Miembros Xprinta Registrados</Text>
            {XPRINTA_AUTHORIZED_MEMBERS.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.memberRow}
                onPress={() => {
                  setLoginEmail(m.email);
                  setLoginPin(m.pinCode);
                  handleLogin(m.email, m.pinCode);
                }}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {m.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberRole}>{m.role}</Text>
                </View>
                <View style={styles.pinPill}>
                  <Text style={styles.pinPillText}>PIN: {m.pinCode}</Text>
                </View>
              </TouchableOpacity>
            ))}
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

  const filteredIdeas = ideas.filter(item => {
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

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

      {/* Canvas Cuántico */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={triggerVoiceInteraction}
        style={styles.quantumStage}
      >
        <Animated.View
          style={[
            styles.swarmContainer,
            {
              transform: [
                { rotate: rotateClockwise },
                { scale: frequencyPulse }
              ]
            }
          ]}
        >
          {particleField.slice(0, 60).map(p => (
            <View
              key={p.id}
              style={[
                styles.miniParticle,
                {
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size / 2,
                  backgroundColor: isListening ? '#FFFFFF' : p.color,
                  opacity: p.opacity,
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                  ],
                  shadowColor: p.color,
                  shadowOpacity: isListening ? 1 : 0.6,
                  shadowRadius: isListening ? 6 : 3,
                }
              ]}
            />
          ))}
        </Animated.View>

        <Animated.View
          style={[
            styles.swarmContainer,
            {
              transform: [
                { rotate: rotateCounterClockwise },
                { scale: isListening ? frequencyPulse : 1 }
              ]
            }
          ]}
        >
          {particleField.slice(60, 120).map(p => (
            <View
              key={p.id}
              style={[
                styles.miniParticle,
                {
                  width: p.size * (isListening ? 1.4 : 1),
                  height: p.size * (isListening ? 1.4 : 1),
                  borderRadius: p.size / 2,
                  backgroundColor: p.color,
                  opacity: p.opacity,
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                  ],
                }
              ]}
            />
          ))}
        </Animated.View>

        <Animated.View
          style={[
            styles.quantumCore,
            {
              transform: [{ scale: isListening ? frequencyPulse : 1 }],
              borderColor: isListening ? '#FFFFFF' : colors.primary,
              backgroundColor: isListening ? 'rgba(241, 129, 8, 0.25)' : 'rgba(241, 129, 8, 0.08)'
            }
          ]}
        >
          <View style={styles.coreCenterDot} />
        </Animated.View>

        <View style={styles.statusBox}>
          {isProcessingAI ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.statusText}>{voiceStatus}</Text>
            </View>
          ) : (
            <Text style={styles.statusText}>{voiceStatus}</Text>
          )}

          {assistantResponse !== '' && (
            <View style={styles.responseBubble}>
              <Volume2 size={16} color={colors.primary} style={{ marginRight: 8 }} />
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
          <Bookmark size={16} color={colors.paper} />
          <Text style={styles.pillButtonText}>Ideas ({ideas.length})</Text>
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
              <View>
                <Text style={styles.eyebrow}>REPOSITORIO DE IDEAS</Text>
                <Text style={styles.sheetTitle}>Ideas & Enlaces</Text>
              </View>
              <TouchableOpacity hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} onPress={() => setIdeasModalVisible(false)}>
                <X size={20} color={colors.n400} />
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {CATEGORIES.map(c => (
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

            <ScrollView contentContainerStyle={styles.sheetScroll}>
              {filteredIdeas.map(item => (
                <View key={item.id} style={styles.ideaCard}>
                  <View style={styles.cardTop}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.category}</Text>
                    </View>
                    <Text style={styles.cardDate}>
                      {new Date(item.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardContent}>{item.content}</Text>
                  {item.url && (
                    <TouchableOpacity style={styles.linkRow}>
                      <ExternalLink size={12} color={colors.primary} />
                      <Text style={styles.linkRowText} numberOfLines={1}>{item.url}</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.cardBottom}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {item.tags.map(t => (
                        <Text key={t} style={styles.tagLabel}>#{t}</Text>
                      ))}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        BlueAppService.createTask({
                          title: item.title,
                          description: item.content,
                          projectId: projects[0]?.id || 'proj_01'
                        });
                      }}
                      style={styles.blueBtn}
                    >
                      <FolderKanban size={12} color={colors.primary} />
                      <Text style={styles.blueBtnText}>A Blue.app</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Añadir Nota */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nueva Nota / Enlace</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={20} color={colors.n400} />
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

            <Text style={styles.fieldLabel}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CATEGORIES.filter(c => c !== 'Todos').map(c => (
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
              <Text style={styles.sheetTitle}>Perfil Corporativo & IA</Text>
              <TouchableOpacity hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} onPress={() => setSettingsVisible(false)}>
                <X size={20} color={colors.n400} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
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
    color: colors.paper,
    letterSpacing: -0.5,
  },
  loginSubtitle: {
    fontSize: typography.sizes.bodySm,
    color: colors.n400,
    marginTop: 6,
    lineHeight: 20,
  },
  loginCard: {
    backgroundColor: '#0F0F0F',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    marginBottom: spacing.xl,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#262626',
    height: 48,
  },
  textInputInside: {
    flex: 1,
    marginLeft: 10,
    color: colors.paper,
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
    color: colors.n500,
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
    color: colors.paper,
    fontFamily: typography.fontSans.semiBold,
    fontSize: 13,
  },
  memberRole: {
    color: colors.n500,
    fontSize: 11,
  },
  pinPill: {
    backgroundColor: '#161616',
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
    fontSize: 10,
    fontFamily: typography.fontSans.semiBold,
    letterSpacing: 1.2,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  brandTitle: {
    fontSize: typography.sizes.h2,
    fontFamily: typography.fontSans.light,
    color: colors.paper,
    letterSpacing: -0.5,
  },
  brandTitleAccent: {
    fontFamily: typography.fontSerif.italic,
    color: colors.primary,
  },
  userBadge: {
    backgroundColor: '#161616',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#262626',
  },
  userBadgeText: {
    color: colors.primary,
    fontFamily: typography.fontSans.semiBold,
    fontSize: 12,
  },
  settingsIconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222222',
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
  quantumCore: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },
  coreCenterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  statusBox: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  statusText: {
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontSans.medium,
    color: colors.n400,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  responseBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    maxWidth: SCREEN_WIDTH * 0.86,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  responseText: {
    color: colors.paper,
    fontSize: 13,
    fontFamily: typography.fontSans.regular,
    flex: 1,
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
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#222222',
    gap: 8,
  },
  pillButtonText: {
    color: colors.paper,
    fontFamily: typography.fontSans.semiBold,
    fontSize: 13,
  },
  actionCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F0F0F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    maxHeight: SCREEN_HEIGHT * 0.82,
    borderTopWidth: 1,
    borderColor: '#1F1F1F',
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
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: typography.sizes.h2,
    fontFamily: typography.fontSans.light,
    color: colors.paper,
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#202020',
  },
  profileBoxName: {
    color: colors.paper,
    fontFamily: typography.fontSans.semiBold,
    fontSize: 14,
  },
  profileBoxRole: {
    color: colors.primary,
    fontSize: 12,
    marginTop: 2,
  },
  profileBoxEmail: {
    color: colors.n500,
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
    backgroundColor: '#161616',
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#222222',
    height: 40,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: colors.paper,
    fontFamily: typography.fontSans.regular,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: '#161616',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#222222',
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: 11,
    color: colors.n400,
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
    backgroundColor: '#141414',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#202020',
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
    fontSize: 10,
    fontFamily: typography.fontSans.semiBold,
  },
  cardDate: {
    color: colors.n500,
    fontSize: 10,
  },
  cardTitle: {
    color: colors.paper,
    fontSize: 14,
    fontFamily: typography.fontSans.semiBold,
    marginBottom: 2,
  },
  cardContent: {
    color: colors.n300,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    padding: 6,
    borderRadius: 4,
    marginBottom: 6,
    gap: 4,
  },
  linkRowText: {
    color: colors.primary,
    fontSize: 11,
    flex: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#202020',
    paddingTop: 6,
  },
  tagLabel: {
    color: colors.n500,
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
    color: colors.n400,
    fontSize: 11,
    fontFamily: typography.fontSans.semiBold,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.paper,
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
    color: colors.paper,
    fontFamily: typography.fontSans.semiBold,
    fontSize: 13,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#1C1C1C',
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  btnSecondaryText: {
    color: colors.paper,
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
  btnSyncNasText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: typography.fontSans.bold,
  },
  nasStatusCard: {
    backgroundColor: '#121212',
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
  primaryActionBtnText: {
    color: colors.white,
    fontFamily: typography.fontSans.bold,
    fontSize: 14,
  },
});
