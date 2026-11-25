import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runWithContext } from '@devvit/web/server';
import type { Context } from '@devvit/web/server';
import {
  formatDailyPostTitle,
  createPost,
} from './core/post.ts';
import { menu } from './routes/menu.ts';
import { triggers } from './routes/triggers.ts';
import { api } from './routes/api.ts';

void describe('Phase 8: Reddit-Native Integration', () => {
  void describe('Dynamic Post Creation & Title Generation', () => {
    void it('formats post title with epoch day index and date', () => {
      const title = formatDailyPostTitle('2026-11-23');
      assert.match(title, /^Daily Paradox #\d+ — 2026-11-23: Can you spot the broken button\?$/);
      assert.strictEqual(title.includes('#20780'), true);
    });

    void it('creates a post using custom client with structured metadata', async () => {
      let submittedTitle = '';
      let submittedEntry = '';
      let submittedSubreddit = '';
      let submittedPuzzleId = '';
      let submittedStartValue = 0;
      let submittedTargetValue = 0;
      let submittedParMoves = 0;
      let submittedTextFallback = '';

      const mockClient = {
        submitCustomPost: async (options: {
          title: string;
          entry?: string;
          subredditName?: string;
          postData?: Record<string, unknown>;
          textFallback?: { text: string };
        }) => {
          submittedTitle = options.title;
          submittedEntry = options.entry ?? '';
          submittedSubreddit = options.subredditName ?? '';
          submittedTextFallback = options.textFallback?.text ?? '';
          if (options.postData) {
            const data = options.postData;
            if (typeof data.puzzleId === 'string') {
              submittedPuzzleId = data.puzzleId;
            }
            if (typeof data.startValue === 'number') {
              submittedStartValue = data.startValue;
            }
            if (typeof data.targetValue === 'number') {
              submittedTargetValue = data.targetValue;
            }
            if (typeof data.parMoves === 'number') {
              submittedParMoves = data.parMoves;
            }
          }
          return { id: 't3_fake_123' };
        },
      };

      const result = await createPost({
        date: '2026-11-23',
        subredditName: 'daily_paradox_community',
        client: mockClient,
      });

      assert.strictEqual(result.id, 't3_fake_123');
      assert.strictEqual(result.subredditName, 'daily_paradox_community');
      assert.strictEqual(result.puzzleDate, '2026-11-23');
      assert.strictEqual(submittedEntry, 'default');
      assert.strictEqual(submittedSubreddit, 'daily_paradox_community');
      assert.strictEqual(submittedPuzzleId, 'puzzle-2026-11-23');
      assert.strictEqual(submittedStartValue, 3);
      assert.strictEqual(submittedTargetValue, 23);
      assert.strictEqual(submittedParMoves, 3);
      assert.match(submittedTitle, /Daily Paradox #/);
      assert.match(submittedTextFallback, /Daily Paradox/);
    });
  });

  void describe('Reddit Menu Routes', () => {
    void it('handles /post-create endpoint', async () => {
      const req = new Request('http://localhost/post-create', {
        method: 'POST',
      });
      const res = await menu.fetch(req);
      assert.strictEqual(res.status === 200 || res.status === 400, true);
      const json: unknown = await res.json();
      assert.strictEqual(typeof json, 'object');
      assert.notStrictEqual(json, null);
    });

    void it('handles /example-form endpoint', async () => {
      const req = new Request('http://localhost/example-form', {
        method: 'POST',
      });
      const res = await menu.fetch(req);
      assert.strictEqual(res.status, 200);
      const json: unknown = await res.json();
      assert.strictEqual(typeof json, 'object');
      if (typeof json === 'object' && json !== null) {
        assert.strictEqual('showForm' in json, true);
      }
    });
  });

  void describe('Reddit Lifecycle Triggers', () => {
    void it('handles /on-app-install endpoint', async () => {
      const req = new Request('http://localhost/on-app-install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'install' }),
      });
      const res = await triggers.fetch(req);
      assert.strictEqual(res.status === 200 || res.status === 400, true);
      const json: unknown = await res.json();
      assert.strictEqual(typeof json, 'object');
      assert.notStrictEqual(json, null);
    });
  });

  void describe('Reddit API Context Integration', () => {
    void it('serves /daily with community and post context fallback', async () => {
      const req = new Request('http://localhost/daily?date=2026-11-23');
      const res = await api.fetch(req);
      assert.strictEqual(res.status, 200);

      const json: unknown = await res.json();
      assert.strictEqual(typeof json, 'object');
      if (typeof json === 'object' && json !== null) {
        assert.strictEqual('type' in json && json.type === 'daily', true);
        assert.strictEqual('puzzle' in json, true);
      }
    });

    void it('serves /daily with injected context via runWithContext', async () => {
      const mockContext: Context = {
        subredditId: 't5_test_sub',
        subredditName: 'daily_paradox_community',
        userId: 't2_test_user',
        appName: 'daily-paradox',
        appSlug: 'daily-paradox',
        appVersion: '0.0.1',
        loid: undefined,
        postId: 't3_test_post',
        commentId: undefined,
        postData: undefined,
        snoovatar: undefined,
        username: 'test_player',
        metadata: {},
      };

      await runWithContext(mockContext, async () => {
        const req = new Request('http://localhost/daily?date=2026-11-23');
        const res = await api.fetch(req);
        assert.strictEqual(res.status, 200);

        const json: unknown = await res.json();
        assert.strictEqual(typeof json, 'object');
        if (typeof json === 'object' && json !== null) {
          assert.strictEqual('type' in json && json.type === 'daily', true);
          assert.strictEqual(
            'subredditName' in json && json.subredditName === 'daily_paradox_community',
            true
          );
          assert.strictEqual(
            'postId' in json && json.postId === 't3_test_post',
            true
          );
        }
      });
    });

    void it('serves /progress with player streak and community attributes fallback', async () => {
      const req = new Request('http://localhost/progress');
      const res = await api.fetch(req);
      assert.strictEqual(res.status, 200);

      const json: unknown = await res.json();
      assert.strictEqual(typeof json, 'object');
      if (typeof json === 'object' && json !== null) {
        assert.strictEqual('type' in json && json.type === 'progress', true);
        assert.strictEqual('currentStreak' in json, true);
        assert.strictEqual('username' in json, true);
      }
    });
  });
});
