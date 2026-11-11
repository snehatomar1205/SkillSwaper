
import { useEffect, useState } from "react";
import {
  fetchGamificationProfile,
  fetchLeaderboard,
  fetchXPHistory,
  fetchMyProfile,
} from "../services/api";

const Leaderboard = () => {
  const [period, setPeriod] = useState("all-time");

  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [teacherLeaderboard, setTeacherLeaderboard] = useState([]);
  const [studentLeaderboard, setStudentLeaderboard] = useState([]);

  const [teacherRank, setTeacherRank] = useState(null);
  const [studentRank, setStudentRank] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState(null);

  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileData, userData] = await Promise.all([
          fetchGamificationProfile(),
          fetchMyProfile(),
        ]);

        setProfile(profileData);
        setCurrentUser(userData.user);
      } catch (err) {
        setError(
          err.message || "Unable to load your gamification profile."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const loadLeaderboards = async () => {
      setLeaderboardLoading(true);
      setError("");

      try {
        const [teacherData, studentData] = await Promise.all([
          fetchLeaderboard("teacher", period),
          fetchLeaderboard("student", period),
        ]);

        setTeacherLeaderboard(teacherData.leaderboard || []);
        setStudentLeaderboard(studentData.leaderboard || []);

        setTeacherRank(teacherData.currentUser || null);
        setStudentRank(studentData.currentUser || null);
      } catch (err) {
        setError(err.message || "Unable to load leaderboards.");
      } finally {
        setLeaderboardLoading(false);
      }
    };

    loadLeaderboards();
  }, [period]);

  const loadHistory = async (page = 1) => {
    setHistoryLoading(true);

    try {
      const data = await fetchXPHistory(page, 10);

      setTransactions((previous) =>
        page === 1
          ? data.transactions || []
          : [
              ...previous,
              ...(data.transactions || []),
            ]
      );

      setHistoryPagination(data.pagination);
      setHistoryPage(page);
    } catch (err) {
      setError(err.message || "Unable to load XP history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1);
  }, []);

  const formatXP = (value) =>
    Number(value || 0).toLocaleString();

  const getUserId = () =>
    String(currentUser?.id || currentUser?._id || "");

  const renderProgress = (progress) => {
    if (!progress) return null;

    return (
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatXP(progress.currentLevelXP)} XP</span>
          <span>
            {progress.nextLevelXP === null
              ? "Maximum level"
              : `${formatXP(progress.nextLevelXP)} XP`}
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{
              width: `${progress.progressPercent || 0}%`,
            }}
          />
        </div>

        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {progress.nextLevelXP === null
            ? "Maximum level reached"
            : `${formatXP(progress.xpRemaining)} XP to next level`}
        </p>
      </div>
    );
  };

  const renderPersonalRank = (title, data, icon) => (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-800 dark:bg-indigo-950/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {data?.rank ? `#${data.rank}` : "Unranked"}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {formatXP(data?.xp)} XP
          </p>
        </div>

        <div className="text-3xl">{icon}</div>
      </div>

      <div className="mt-4 border-t border-indigo-200 pt-3 dark:border-indigo-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Current level
        </p>
        <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
          Level {data?.level || 1}
        </p>
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {period === "all-time"
          ? "Your overall ranking"
          : `Your ${period} XP ranking`}
      </p>
    </section>
  );

  const renderLeaderboard = (title, entries) => (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">
        {title}
      </h2>

      {leaderboardLoading ? (
        <p className="py-8 text-center text-gray-500">
          Loading rankings...
        </p>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          No rankings available yet.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isCurrentUser =
              String(entry.userId) === getUserId();

            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 rounded-xl p-3 ${
                  isCurrentUser
                    ? "border border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"
                    : "bg-gray-50 dark:bg-slate-800"
                }`}
              >
                <span className="w-7 text-center font-bold text-gray-500">
                  #{entry.rank}
                </span>

                <img
                  src={
                    entry.avatarUrl ||
                    "https://placehold.co/40x40?text=User"
                  }
                  alt={entry.username}
                  className="h-10 w-10 rounded-full object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-800 dark:text-white">
                    {entry.username}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">
                        You
                      </span>
                    )}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Level {entry.level || 1}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">
                    {formatXP(entry.xp)} XP
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!leaderboardLoading && entries.length === 100 && (
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Showing the top 100 participants. Your personal rank is shown above.
        </p>
      )}
    </section>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-10 text-center text-gray-500 dark:bg-slate-950">
        Loading gamification profile...
      </div>
    );
  }

  const gamification = profile?.gamification || {};
  const achievements = profile?.achievements || [];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Leaderboard
          </h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Track your progress, earn XP, and see how you rank in SkillSwap.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Personal XP Overview */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-indigo-600 p-5 text-white shadow">
            <p className="text-sm text-indigo-100">Total XP</p>
            <p className="mt-2 text-3xl font-bold">
              {formatXP(gamification.totalXP)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-slate-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Teacher Level
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {gamification.teacherLevel || 1}
            </p>
            {renderProgress(gamification.teacherProgress)}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-slate-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Student Level
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {gamification.studentLevel || 1}
            </p>
            {renderProgress(gamification.studentProgress)}
          </div>
        </section>

        {/* Current User Ranks */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
            Your Current Rankings
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            {renderPersonalRank(
              "Teacher Ranking",
              teacherRank,
              "🎓"
            )}

            {renderPersonalRank(
              "Student Ranking",
              studentRank,
              "📚"
            )}
          </div>
        </section>

        {/* Leaderboard Period Filter */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Rankings
          </h2>

          <div className="flex gap-2">
            {["weekly", "monthly", "all-time"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                  period === item
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Side-by-side Leaderboards */}
        <div className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {renderLeaderboard(
            "Top Teachers",
            teacherLeaderboard
          )}

          {renderLeaderboard(
            "Top Learners",
            studentLeaderboard
          )}
        </div>

        {/* Achievements */}
        <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-slate-900">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
            Your Achievements
          </h2>

          {achievements.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No achievements unlocked yet. Complete an exchange to get started.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold capitalize text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                >
                  {String(achievement).replaceAll("_", " ")}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* XP History */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-slate-900">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
            XP History
          </h2>

          {transactions.length === 0 && !historyLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No XP transactions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction._id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 dark:border-gray-800"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {transaction.description}
                    </p>

                    <p className="mt-1 text-xs capitalize text-gray-500 dark:text-gray-400">
                      {transaction.role} ·{" "}
                      {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <span className="font-bold text-green-600 dark:text-green-400">
                    +{formatXP(transaction.amount)} XP
                  </span>
                </div>
              ))}
            </div>
          )}

          {historyPagination &&
            historyPage < historyPagination.totalPages && (
              <button
                type="button"
                onClick={() => loadHistory(historyPage + 1)}
                disabled={historyLoading}
                className="mt-5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {historyLoading ? "Loading..." : "Load more"}
              </button>
            )}
        </section>
      </div>
    </div>
  );
};

export default Leaderboard;
