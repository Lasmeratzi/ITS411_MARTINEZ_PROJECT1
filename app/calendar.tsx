import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react"; // ADDED: useEffect import
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// NEW: Import service functions
import { subscribeToAlbumsByMonth } from "../services/albumsService";
import { subscribeToMemoriesByMonth } from "../services/memoriesService";

export default function Calendar() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // NEW: State for memories and albums data
  const [memories, setMemories] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // NEW: Load memories and albums when month changes
  useEffect(() => {
    const unsubscribeMemories = subscribeToMemoriesByMonth(
      setMemories,
      currentYear,
      currentMonth
    );
    
    const unsubscribeAlbums = subscribeToAlbumsByMonth(
      setAlbums,
      currentYear,
      currentMonth
    );

    return () => {
      if (unsubscribeMemories) unsubscribeMemories();
      if (unsubscribeAlbums) unsubscribeAlbums();
    };
  }, [currentYear, currentMonth]);

  // Get days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Handle date selection
  // Handle date selection - FIXED TIMEZONE ISSUE
const handleDateSelect = (day: number) => {
  // Create date in local timezone
  const selected = new Date(currentYear, currentMonth, day);
  setSelectedDate(selected);
  
  // Pass date as a simple string to avoid timezone issues
  const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  router.push({
    pathname: "/calendar-day",
    params: { date: dateString }
  });
};

  // NEW: Check if a date has memories or albums
  const hasContentForDate = (day: number) => {
    const dateToCheck = new Date(currentYear, currentMonth, day);
    const dateString = dateToCheck.toISOString().split('T')[0];
    
    // Check memories
    const hasMemories = memories.some(memory => 
      memory.date && memory.date.split('T')[0] === dateString
    );
    
    // Check albums
    const hasAlbums = albums.some(album => 
      album.date && album.date.split('T')[0] === dateString
    );
    
    return hasMemories || hasAlbums;
  };

  // Generate calendar days
  const renderCalendarDays = () => {
    const days = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = new Date().getDate() === day && 
                     new Date().getMonth() === currentMonth && 
                     new Date().getFullYear() === currentYear;
      
      const isSelected = selectedDate && 
                        selectedDate.getDate() === day && 
                        selectedDate.getMonth() === currentMonth && 
                        selectedDate.getFullYear() === currentYear;

      // UPDATED: Use real data instead of mock data
      const hasContent = hasContentForDate(day);

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && styles.calendarDayToday,
            isSelected && styles.calendarDaySelected,
          ]}
          onPress={() => handleDateSelect(day)}
        >
          <Text style={[
            styles.calendarDayText,
            isToday && styles.calendarDayTextToday,
            isSelected && styles.calendarDayTextSelected,
          ]}>
            {day}
          </Text>
          {hasContent && <View style={styles.memoryDot} />}
        </TouchableOpacity>
      );
    }

    return days;
  };

  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Day names
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calendar</Text>
          <TouchableOpacity 
            style={styles.todayButton}
            onPress={goToToday}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={goToPreviousMonth}
            >
              <Ionicons name="chevron-back" size={24} color="#7C3AED" />
            </TouchableOpacity>
            
            <Text style={styles.monthYearText}>
              {monthNames[currentMonth]} {currentYear}
            </Text>
            
            <TouchableOpacity 
              style={styles.navButton}
              onPress={goToNextMonth}
            >
              <Ionicons name="chevron-forward" size={24} color="#7C3AED" />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.daysHeader}>
            {dayNames.map((dayName) => (
              <Text key={dayName} style={styles.dayHeaderText}>
                {dayName}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {renderCalendarDays()}
          </View>

          {/* UPDATED: Info Section */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Calendar View</Text>
            <Text style={styles.infoText}>
              Tap on any date to view memories from that day or create new ones. 
              Days with dots indicate existing memories or albums.
            </Text>
            
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.memoryDot, styles.legendDot]} />
                <Text style={styles.legendText}>Has memories or albums</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.calendarDayToday, styles.legendToday]} />
                <Text style={styles.legendText}>Today</Text>
              </View>
            </View>
            
            {/* NEW: Stats */}
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{memories.length}</Text>
                <Text style={styles.statLabel}>Memories this month</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{albums.length}</Text>
                <Text style={styles.statLabel}>Albums this month</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Quick Actions</Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/addMemory")}
            >
              <View style={styles.actionIcon}>
                <Icon name="plus-circle" size={24} color="#7C3AED" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Add Memory</Text>
                <Text style={styles.actionSubtitle}>Create a new memory</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/albums")}
            >
              <View style={styles.actionIcon}>
                <Icon name="book-multiple" size={24} color="#10B981" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>View Albums</Text>
                <Text style={styles.actionSubtitle}>Browse your albums</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF5FF",
  },
  header: {
    backgroundColor: "#7C3AED",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  todayButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  todayButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  monthYearText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  daysHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarDayEmpty: {
    width: "14.28%", // 100% / 7 days
    aspectRatio: 1,
    margin: 2,
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    margin: 2,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  calendarDayToday: {
    backgroundColor: "#7C3AED",
  },
  calendarDaySelected: {
    backgroundColor: "#EDE9FE",
    borderWidth: 2,
    borderColor: "#7C3AED",
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  calendarDayTextToday: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  calendarDayTextSelected: {
    color: "#7C3AED",
    fontWeight: "700",
  },
  memoryDot: {
    position: "absolute",
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7C3AED",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  legend: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    position: "relative",
    bottom: 0,
  },
  legendToday: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 12,
    color: "#6B7280",
  },
  // NEW: Stats styles
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#7C3AED",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
});