import { useCallback, useEffect, useState } from "react";
import { fetchSeasonalEvents, joinSeasonalEvent } from "../services/api";

import { useNavigate } from "react-router-dom";

const CONDITION_LABELS = {
  completed_exchanges: "Complete exchanges",
  teaching_sessions: "Teaching sessions",
  learning_sessions: "Learning sessions",
  xp_earned: "Earn XP",
  skill_category_sessions: "Sessions in a skill category",
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const SeasonalEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const loadEvents = useCallback(async () => {
    try {
      setError("");
      const data = await fetchSeasonalEvents();
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message || "Unable to load seasonal events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleJoin = async (eventId, role) => {
    const key = `${eventId}-${role}`;

    try {
      setJoining(key);
      setError("");
      setSuccess("");

      const data = await joinSeasonalEvent(eventId, role);

      setSuccess(data.message || "Event participation confirmed.");
      await loadEvents();
    } catch (err) {
      setError(err.message || "Unable to join this event.");
    } finally {
      setJoining("");
    }
  };

  const renderParticipation = (event, role) => {
    const participation = (event.myParticipations || []).find(
      (item) => item.role === role,
    );

    if (!participation) {
      const key = `${event._id}-${role}`;

      return (
        <button
          type="button"
          onClick={() => handleJoin(event._id, role)}
          disabled={joining === key}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {joining === key ? "Joining..." : `Join as ${role}`}
        </button>
      );
    }

    return (
      <div className="mt-4 space-y-3">
        <p className="text-sm font-semibold capitalize text-green-600 dark:text-green-400">
          Joined as {role}
        </p>

        {event.challenges
          .filter(
            (challenge) =>
              challenge.eligibleRole === "both" ||
              challenge.eligibleRole === role,
          )
          .map((challenge) => {
            const progress = participation.challenges?.find(
              (item) => String(item.challengeId) === String(challenge._id),
            );

            const current = progress?.currentProgress || 0;
            const target = challenge.target || 1;
            const percentage = Math.min(100, (current / target) * 100);

            return (
              <div
                key={challenge._id}
                className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-gray-800 dark:text-white">
                    {challenge.title}
                  </p>

                  {progress?.completed ? (
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                      Completed
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {current}/{target}
                    </span>
                  )}
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        Loading seasonal events...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Seasonal Events
        </h1>

        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Participate in challenges, complete milestones, and earn additional XP
          and achievements.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-lg bg-green-100 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {success}
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            No seasonal events available
          </h2>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Check back later for upcoming events and challenges.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {events.map((event) => (
            <section
              key={event._id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-900"
            >
              {event.bannerUrl && (
                <img
                  src={event.bannerUrl}
                  alt={event.title}
                  className="h-48 w-full object-cover"
                />
              )}

              <div className="p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      event.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    }`}
                  >
                    {event.status}
                  </span>

                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(event.startDate)} – {formatDate(event.endDate)}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {event.title}
                </h2>

                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {event.description}
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/events/${event._id}/leaderboard`)}
                  className="mb-4 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950"
                >
                  View Event Leaderboard
                </button>
                <div className="mt-5">
                  <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">
                    Challenges
                  </h3>

                  <div className="space-y-3">
                    {event.challenges.map((challenge) => (
                      <div
                        key={challenge._id}
                        className="rounded-xl border border-gray-100 p-3 dark:border-gray-700"
                      >
                        <p className="font-medium text-gray-800 dark:text-white">
                          {challenge.title}
                        </p>

                        {challenge.description && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {challenge.description}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            {CONDITION_LABELS[challenge.conditionType] ||
                              challenge.conditionType}
                            {challenge.conditionType ===
                              "skill_category_sessions" &&
                              challenge.skillCategory &&
                              `: ${challenge.skillCategory}`}
                          </span>

                          <span>Target: {challenge.target}</span>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                          Reward: {challenge.rewardXP} XP
                          {challenge.rewardAchievementId && " + Achievement"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-700">
                  <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">
                    Your Participation
                  </h3>

                  <div className="space-y-5">
                    {event.eligibleRoles.map((role) => (
                      <div key={role}>
                        <p className="mb-2 text-sm font-medium capitalize text-gray-600 dark:text-gray-300">
                          {role}
                        </p>

                        {renderParticipation(event, role)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeasonalEvents;
