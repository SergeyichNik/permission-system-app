# Оценка системы Policy Access + Access Matrix

## Context

Проект — пилот/референс-имплементация системы прав, которая ляжет в основу рабочего проекта. Тон технический и прямой, без смягчения. Формат: score-card по 9 критериям (0–10) + архитектурный review + production-audit + сравнение с индустриальными решениями + список оставшихся работ.

Главный вопрос: **годится ли этот паттерн в боевой проект в текущем виде, или нужны доработки до переноса?**

> Эта оценка отражает состояние **после первого прохода рефакторинга** (см. раздел «Сделано» ниже). Пункты, которые уже закрыты, в тексте помечены отдельно.

---

## Score-card (итог: 70/90 ≈ 7.8/10 — было 63/90)

| # | Критерий                                 | Балл  | Δ   |
|---|------------------------------------------|-------|-----|
| 1 | Type safety                              | 8/10  | +1  |
| 2 | Архитектура / разделение ответственности | 9/10  | +1  |
| 3 | Расширяемость                            | 9/10  | +1  |
| 4 | Читаемость / DX                          | 9/10  | +1  |
| 5 | Производительность                       | 7/10  | —   |
| 6 | Тестируемость                            | 7/10  | —   |
| 7 | Корректность / boundary cases            | 8/10  | +1  |
| 8 | Production-readiness                     | 6/10  | +2  |
| 9 | Соответствие industry standards          | 7/10  | —   |

**Вердикт:** после трёх проходов архитектура чистая (generic-примитивы отделены от UI-обёрток, overrides декларативные и работают с любой формой объекта), boot-гонка закрыта, domain-фильтрация оживлена. Для переноса в боевой проект остаётся добить Production-readiness (audit-log, reset, runtime-валидация, реестр типов, тесты).

---

## 1. Type safety — 8/10

**Что хорошо**
- `Action` как union literal types (`src/permissions/types.ts:9`) — опечатка в `can('ordres:page:view')` ловится компилятором.
- **[Сделано]** `usePermissions.can` теперь типизирован как `CanFn = (action: Action) => boolean` (`src/permissions/types.ts:9`, `src/permissions/usePermissions.ts`). Каст `as Action` убран. Тот же `CanFn` протянут через `MasterOption.policy`, `OptionTransform.modify`, `resolveSelectOptions`, `resolveOrderOptions`.
- `AccessRule` / `ExtendedAccess` / `AccessMatrix<TKey>` полностью типизированы (`src/accessMatrix/types.ts`).
- `MasterOption<TMeta>` параметризован через generic.

**Что плохо**
- `flag: string` в `ExtendedAccess` — не union и не enum. Опечатка = silent no-op, валидатор её не ловит.
- `roles: string[]` и `operationIds: string[]` в `AccessRule` — голые строки. Может появиться `roles: ['admni']` без предупреждения.
- `allowedIn?: string[]` в `MasterOption` — тоже `string[]`, не связан с конкретным union доменов конкретной формы. Свежедобавленный `OrderFormDomain` = `'my' | 'common' | 'archive'` — валидный для orders, но нет compile-time связи между тегами опции и списком допустимых доменов.

**Рекомендация**
- Реестр `FeatureFlag`, `Role`, `OperationId` как literal unions + параметризация `MasterOption<TMeta, TDomain extends string>` с `allowedIn?: TDomain[]`.

---

## 2. Архитектура / разделение ответственности — 9/10

**Что хорошо**
- Ортогональность Part 1 / Part 2: политики отвечают за «named действия» (`can('orders:page:view')`), матрица — за «коллекции однотипных сущностей» (task types, columns). Правильное разделение — не попытка уместить всё в одну абстракцию.
- `resolveAccess<TKey>` (`src/accessMatrix/resolveAccess.ts:37`) generic по ключу — одна логика для taskType и column, добавление новой матрицы = тривиальное копирование.
- **[Сделано]** Primitive-слой для массивов: `src/access/` содержит `AccessGatedItem`, `filterByPolicy`, `filterByDomain`, `filterAccessible`. Эти примитивы не зависят от `<select>`, `MasterOption` или любого UI-компонента — пригодны для табов, меню, кнопок, колонок, любых массивов gated-элементов.
- `MasterOption` теперь `extends AccessGatedItem`, а `resolveSelectOptions` строится как композиция: `filterAccessible → allowedValues escape-hatch → strip policy → modify`. Select-specific остаётся там, где ему место; generic отделён.
- `MasterOption.policy` (`src/utils/optionUtils.ts`) — единственная точка входа для проверки доступа к опциям. Политика получает и `can`, и `ctx` — можно смешивать Part 1 и Part 2.

**Что плохо**
- `canSeeTaskType` и `canSeeColumn` — одинаковые однострочные обёртки (`taskTypeAccess.ts:196`, `columnAccess.ts:39`). Копипаста с риском расхождений. (Это другой механизм — матрица, а не массив, поэтому новые примитивы к нему напрямую не применимы.)
- Нет места для композиции политик (`and(p1, p2)`, `or(p1, p2)`). Пока делается вручную внутри PolicyFn — ок для текущего объёма.

**Рекомендация**
- Factory `createMatrixAccess<TKey>(matrix)` вместо двух обёрток или вызывать `resolveAccess(MATRIX, id, ctx)` напрямую.
- При >50 политиках — combinator'ы в `base.ts`.

---

## 3. Расширяемость — 8/10

**Что хорошо**
- Добавить действие: литерал в `Action` + запись в `policies/*.ts` + импорт в `policies/index.ts`. Три места, все обязательные и type-check их ловит.
- Добавить матрицу: скопировать `taskTypeAccess.ts`, заменить тип ID и entries.
- Добавить роль/operationId: только данные, остальное работает через строки.
- Добавить домен: union-тип формы (`OrderFormDomain`) + проставить `allowedIn` на опциях.

**Что плохо**
- Расширяемость флагов слабая: флаг — строка, нет единого реестра. Ни автокомплита, ни валидации что флаг существует где-то в системе.
- Нет динамической регистрации политик (из плагинов/модулей). Для текущего размера не проблема.

**Рекомендация**
- `type FeatureFlag = 'extendedPriorityEnabled' | 'ppPartnerEnabled' | ...` + типизация `flag: FeatureFlag` в `ExtendedAccess`.

---

## 4. Читаемость / DX — 8/10

**Что хорошо**
- `taskTypeAccess.ts` — живая документация паттерном: 17 записей покрывают все комбинации (открыто / закрыто / whitelist / blacklist / флаг открывает / флаг снимает блок / несколько независимых флагов). Эталонный onboarding.
- README покрывает архитектуру, domain filtering, MasterOption pipeline — редкость для пилотов.
- Резолверы читаются за минуту.

**Что плохо**
- «`removeExcludeRoles` без `addRoles` = silent no-op» — главная DX-ловушка. Задокументировано (`taskTypeAccess.ts:87–96`), но неочевидно: разработчик должен помнить, что `removeExcludeRoles` снимает запрет **только** для тех, кто уже попал в whitelist.
- `action_nobody` = `{roles: [], operationIds: []}` и `action_basic_view` = `{}` — противоположные «пустые» случаи. Концептуально тонко, новичок перепутает.
- Префиксы `action_pp_*` без ключа (что такое `pp`? privileged? paid?).

**Рекомендация**
- Переименовать `removeExcludeRoles` во что-то отражающее связку (например `unblockForAddedRoles`), либо discriminated union, где `removeExcludeRoles` требует `addRoles`.
- В `validateAccess` warning «`removeExcludeRoles` без `addRoles`».
- Описать `pp` в README.

---

## 5. Производительность — 7/10

**Что хорошо**
- `Set<string>` / `Map<string, boolean>` в сторе — O(1) lookup'ы в горячих путях.
- `useMemo(ctx)` и `useCallback(can)` в hook — стабильные ссылки при неизменном state.
- `resolveAccess` — короткие проверки, без аллокаций кроме случая активных флагов.

**Что плохо**
- `usePermissionsStore()` без селектора (`usePermissions.ts:7`): компонент подписывается на весь state. Любое изменение любого поля = re-render каждого компонента с `usePermissions`. (`ProtectedRoute` уже использует селектор `(s) => s.initialized`, но сам `usePermissions` — нет.)
- `applyExtensions` (`resolveAccess.ts:4`) аллоцирует новые массивы каждый вызов, даже если ни один флаг не активен.
- `resolveSelectOptions` не мемоизирован на стороне вызова (в `useOrderFormConfig` всё обёрнуто в `useMemo`, но внутри форм с другими интеграциями можно пропустить).

**Рекомендация**
- Селекторы в `usePermissions`: `usePermissionsStore((s) => s.roles)` и т.д.
- Early-return в `applyExtensions` если ни один флаг не активен — вернуть `base` без копирования.
- Гайд-лайн: оборачивать `resolveSelectOptions` в `useMemo` на стороне вызова.

---

## 6. Тестируемость — 7/10

**Что хорошо**
- `resolvePermission`, `resolveAccess`, `applyExtensions`, политики из `base.ts` — чистые функции. Идеал для unit-тестов.
- Матрица — plain data, комбинаторные тесты тривиальны.
- Zustand store изолирован.

**Что плохо**
- **Тестов в репозитории нет вовсе.** В `package.json` нет ни vitest, ни jest. Инфраструктура ≠ наличие.
- Нет e2e-теста роут-гардов.
- `validateAccess` сам без теста.

**Рекомендация**
- Поставить vitest (интеграция с vite бесшовная).
- Минимум: (а) table-test на `resolveAccess` по всем 17 кейсам из `taskTypeAccess.ts`; (б) по smoke-тесту на каждую policy; (в) integration-тест на `ProtectedRoute` с мок-стором (loading/denied/allowed/loop).

---

## 7. Корректность / boundary cases — 8/10

**Что хорошо**
- `resolveAccess` осмысленно различает: пустая запись (allow), whitelist (gate), blacklist (deny), blacklist+extensions. Порядок вычислений корректен.
- `validateAccess` ловит типовые ошибки в dev. **[Сделано]** проверка включается через `import.meta.env.DEV` (`src/accessMatrix/validateAccess.ts:7`) — vite-native, без зависимости от Node-типов.
- Fail-safe дефолты: нет политики → `false` (Part 1), нет записи в матрице → `true` (Part 2). Они разные, но согласованы с моделью.
- **[Сделано]** Race на boot закрыт: `initialized: boolean` в сторе, `ProtectedRoute` показывает `Loading…` до инициализации вместо редиректа на пустом store.
- **[Сделано]** Loop-protection: `ProtectedRoute` перед редиректом проверяет через `ROUTE_CONFIG`, что у пользователя есть доступ к `redirectTo`. Если нет — рендерит 403, не зацикливается.

**Что плохо**
- `validateAccess` не проверяет: (а) пересечение `roles` и `excludeRoles` в одной записи; (б) `addRoles`, дублирующее `roles` базы; (в) несуществующие флаги; (г) `removeExcludeRoles` без `addRoles`/`addOperationIds` = silent no-op.
- `policies[action]` если undefined → `false` без warning в dev. Опечатка = тихая дыра (это уже компиляционная ошибка благодаря типизации `can: CanFn`, но ошибки на стыке `resolvePermission(action, ctx)` из произвольного кода не ловятся).
- Нет централизованного списка всех ролей/operationIds — возможен рассинхрон mock'а и политик.

**Рекомендация**
- Расширить `validateAccess` пунктами (а)–(г).
- Dev-warning при `can('unknown-action')` в `resolvePermission`.
- Реестр ролей/operationIds как union.

---

## 8. Production-readiness — 6/10 (было 4/10)

**[Сделано]**
- Loading state + ProtectedRoute loader — нет flash-of-wrong-content.
- Infinite redirect protection — нет зацикливания при отсутствии доступа к `redirectTo`.
- Scratch-комментарии в `priorityOptions.ts` удалены.
- `validateAccess` переведён на `import.meta.env.DEV` — build больше не падает.

**Что плохо (оставшееся)**
- **Нет audit-лога** denied access. Слепое пятно для безопасности и расследований.
- **Нет error boundary** вокруг `ProtectedRoute`. Если что-то в `usePermissionsStore` бросит — упадёт всё дерево.
- **`setPermissions` без валидации** — принимает любые строки, включая null/undefined внутри массивов (TS не ловит в рантайме).
- **Нет reset-функции** в сторе. Logout → права остаются до перезагрузки.
- **Нет защиты от гонок** при частичных обновлениях: повторный `setPermissions` полностью перезатирает state.

**Рекомендация**
- `console.info` на denied в `ProtectedRoute` (с хуком для Sentry).
- `errorBoundary` вокруг `<AppRoutes />`.
- Reset в сторе + runtime-валидация `setPermissions` (zod или ручная).

---

## 9. Соответствие industry standards — 7/10

**Модель прав**
- **RBAC** — `roles: Set<string>`.
- **ABAC** частично: `operationIds` — атрибуты пользователя, `featureFlags` — атрибуты окружения. Subject-level не поддерживается.
- **PBAC** через `PolicyFn: (ctx) => boolean` — самый общий случай.

**Сравнение с библиотеками**

| Библиотека       | Плюсы vs своё                                                                                    | Минусы vs своё                                                    |
|------------------|--------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| **CASL**         | Subject-level условия на данных, ability builder, React/Vue интеграции, сериализация политик    | Больше зависимостей, своё DSL, избыточен для строго named-actions |
| **Casbin**       | Модель в `.conf`, политики в CSV/БД, декларативно, RBAC/ABAC/ACL из коробки                     | Порог входа выше, избыток для простой RBAC, JS-версия менее зрелая |
| **Cedar (AWS)**  | Формальный DSL, верификация, аудит                                                              | Молодой, vendor lock, избыточен для SPA                           |
| **Oso**          | Polar DSL, data filtering                                                                        | Платный для прода, внешняя зависимость                            |

**Вердикт**
- Текущая модель (named actions + matrix + флаги) лучше подходит под **UI-level gating** (что показывать/скрывать), чем CASL/Casbin, которые заточены на **data-level authorization**.
- Если в рабочем проекте понадобится subject-level («этот заказ принадлежит этому юзеру») — брать CASL параллельно, не смешивая с текущей системой.

**Чего не хватает**
- Subject-level authorization.
- Стандартный формат политик (JSON для экспорта в бэкенд).
- Иерархия ролей (`admin ⊃ manager ⊃ user`). Сейчас в `isManager` захардкожено.

---

## Domain Filtering — реализовано

> **[Сделано]** Механизм оживлён в первом проходе.

**Проблема была:** в `MasterOption` было поле `allowedIn?: string[]` и оно проставлялось в `TASK_TYPE_OPTIONS` (тегами `['my', 'common', 'archive']`), но **никто его не читал**. `resolveSelectOptions` фильтровал только по `transform.allowedValues` — отдельному whitelisted-списку id, передаваемому извне. `resolveOrderOptions` хардкодил список из 3 id без связи с `allowedIn`.

**Как теперь работает:**

1. `resolveSelectOptions(masterList, can, ctx, transform?, domain?)` получил 5-й необязательный параметр `domain` (`src/utils/optionUtils.ts:34`).
2. Если `domain` передан **и** у опции определён `allowedIn` — опция проходит фильтр только когда `allowedIn.includes(domain)`. Если у опции `allowedIn` не указан — опция «живёт во всех доменах» и проходит.
3. `transform.allowedValues` остался как escape-hatch для точечного отключения отдельных id.
4. `resolveOrderOptions(can, ctx, domain)` теперь принимает `domain: OrderFormDomain = 'my' | 'common' | 'archive'` и пробрасывает его вниз (`src/forms/order/resolvers/resolveOrderOptions.ts`). Хардкод `allowedValues: [...]` удалён.
5. `useOrderFormConfig(domain = 'my')` принимает домен сверху (форма «моих заказов», архивная форма и т.д.) и пробрасывает в резолвер (`src/forms/order/useOrderFormConfig.ts`).

**Следующий шаг (should-fix, не вошло):** параметризовать `MasterOption<TMeta, TDomain extends string>` чтобы `allowedIn: TDomain[]` был строго типизирован и связывался с union доменов конкретной формы.

---

## Сделано в первом проходе (Part 5)

| # | Что                                                                                           | Где                                                                  |
|---|-----------------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| 1 | `CanFn = (action: Action) => boolean` протянут через всю цепочку; каст `as Action` убран     | `src/permissions/types.ts`, `usePermissions.ts`, `optionUtils.ts`, `resolveOrderOptions.ts`, `useOrderFormConfig.ts` |
| 2 | Domain-фильтрация через `allowedIn` реально включена                                          | `src/utils/optionUtils.ts`, `src/forms/order/resolvers/resolveOrderOptions.ts`, `useOrderFormConfig.ts` |
| 3 | `initialized: boolean` в сторе + loader в `ProtectedRoute`                                    | `src/store/permissionsStore.ts`, `src/routes/ProtectedRoute.tsx`     |
| 4 | Loop-protection в `ProtectedRoute` через lookup в `ROUTE_CONFIG`                              | `src/routes/ProtectedRoute.tsx`                                      |
| 5 | Scratch-комментарии удалены                                                                   | `src/options/priorityOptions.ts`                                     |
| 6 | `process.env.NODE_ENV` → `import.meta.env.DEV` (vite-native)                                  | `src/accessMatrix/validateAccess.ts`                                 |

## Сделано во втором проходе (Part 6)

| # | Что                                                                                           | Где                                                                  |
|---|-----------------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| 1 | Выделены generic-примитивы для массивов gated-элементов: `AccessGatedItem`, `filterByPolicy`, `filterByDomain`, `filterAccessible` | `src/access/types.ts`, `src/access/accessible.ts`, `src/access/index.ts` |
| 2 | `MasterOption extends AccessGatedItem`; `resolveSelectOptions` теперь композиция примитивов (а не своя встроенная логика фильтрации) | `src/utils/optionUtils.ts`                                           |

**Зачем Part 6:** имя `optionUtils` было слишком узким — логика фильтрации по policy+domain применима не только к селектам (табы, sidebar, кнопки действий, колонки). Теперь в `src/access/` лежат чистые примитивы без зависимости от `<select>`, `MasterOption` или UI-компонентов. В будущем табы/меню/кнопки используют `filterAccessible` напрямую, без `MasterOption`-обёрток.

**Три сценария использования:**

```ts
// 1) Только policy — гейтинг без доменов (action-кнопки, feature-карточки)
filterByPolicy(actions, can, ctx)

// 2) Только domain — переключение контекста без permission-гейтинга
// (сайдбар-разделы, когда роут уже защищён ProtectedRoute)
filterByDomain(tabs, 'archive')

// 3) Всё сразу
filterAccessible(items, can, ctx, 'my')
```

## Сделано в третьем проходе (Part 7)

| # | Что                                                                                          | Где                                                                  |
|---|----------------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| 1 | `AccessOverride<T>` — декларативные перекрытия любых полей объекта по предикату `when(can, ctx, domain?)` | `src/access/types.ts`                                                |
| 2 | `applyOverrides<T>`, `resolveGatedItems<T>`, `stripAccessFields<T>` — UI-агностичные утилиты | `src/access/overrides.ts`, `src/access/resolve.ts`, `src/access/strip.ts` |
| 3 | `MasterOption.overrides?: AccessOverride<MasterOption<TMeta>>[]`, `resolveSelectOptions` применяет overrides и стрипает служебные поля | `src/utils/optionUtils.ts`                                           |
| 4 | Два живых примера overrides: `action_basic_view` меняет label+color в домене `archive`; `action_pp_partner` меняет label+color для роли `admin` | `src/options/taskTypeOptions.ts`                                     |

**Зачем Part 7:** `modify` в `OptionTransform` ограничен — видит только `can`, не `ctx`/`domain`, keyed by id, живёт во внешнем `transform`. Для варианта «поменять label/icon для конкретной роли/домена/флага» это неудобно. К тому же `MasterOption` навязывал `label`/`meta` другим UI-китам — если в проекте используется вторая библиотека с полем `title`, прежняя структура не подходила.

**Ключевая идея:** ядро (`src/access/`) знает только `policy`, `allowedIn`, `overrides.patch: Partial<T>`. UI-поля (`label`/`title`/`text`/`icon`) — зона ответственности пользователя. Каждый UI-кит определяет свой shape через `extends AccessGatedItem`, `patch` автоматически типизируется под его поля.

**Пример (action_basic_view, domain='archive'):**

```ts
{
  id: 'action_basic_view',
  label: 'View',
  meta: { icon: '👁', color: 'blue' },
  allowedIn: ['my', 'common', 'archive'],
  policy: (_can, ctx) => canSeeTaskType('action_basic_view', ctx),
  overrides: [
    {
      when: (_can, _ctx, domain) => domain === 'archive',
      patch: { label: 'Read-only view', meta: { icon: '👁', color: 'gray' } },
    },
  ],
}
```

**Пример с patch-функцией (читает текущее состояние опции):**

```ts
overrides: [
  {
    when: (_can, ctx) => ctx.roles.has('admin'),
    patch: (opt) => ({
      label: `${opt.label} (Admin View)`,
      meta: { ...(opt.meta ?? { icon: '🤝', color: 'green' }), color: 'red' },
    }),
  },
]
```

**Три слоя разделены чисто:**

```
┌─ src/access/  (UI-агностично, generic) ──────────────────────────┐
│  AccessGatedItem, AccessOverride<T>                              │
│  filterByPolicy, filterByDomain, filterAccessible                │
│  applyOverrides, resolveGatedItems                               │
│  stripAccessFields                                               │
└──────────────────────────────────────────────────────────────────┘
       ↑                              ↑
┌─ src/utils/optionUtils.ts ─┐  ┌─ user-defined (табы, меню, etc) ─┐
│  MasterOption (label,meta) │  │  interface TabItem               │
│  resolveSelectOptions      │  │    extends AccessGatedItem       │
│  (select-специфично)       │  │  { title, slug, …}               │
└────────────────────────────┘  └──────────────────────────────────┘
```

**Семантика patch:**
- `Partial<T>` — статический патч, shallow merge. `meta` как вложенный объект **заменяется целиком**.
- `(item: T) => Partial<T>` — функция, читает текущее состояние (включая результат предыдущих overrides в цепочке) и возвращает патч. Используй когда нужен nested merge (`{ ...item.meta, color: 'red' }`).

`npm run build` — зелёный после всех трёх проходов.

---

## Что осталось на следующие итерации

### Should-fix (до переноса в рабочий проект)

- Реестр `Role` / `OperationId` / `FeatureFlag` как literal unions + типизация `AccessRule`/`ExtendedAccess`.
- Параметризация `MasterOption<TMeta, TDomain>` чтобы `allowedIn` был связан с доменом формы.
- Расширение `validateAccess`: конфликты ролей, dangling `removeExcludeRoles`, несуществующие флаги, warning при `removeExcludeRoles` без `addRoles`.
- Селекторы в `usePermissions` вместо подписки на весь store.
- Dev-warning в `resolvePermission` при неизвестном action.
- Reset-функция в сторе + runtime-валидация `setPermissions`.
- Vitest + table-test на `resolveAccess` (17 кейсов), smoke-тесты на политики, integration-тест на `ProtectedRoute`.

### Nice-to-have

- Мемоизация `resolveSelectOptions` в вызывающих формах — гайдлайн.
- Early-return в `applyExtensions` при отсутствии активных флагов.
- Factory `createMatrixAccess<TKey>` вместо дублирующихся обёрток.
- Audit-лог denied actions (`console.info` + хук для Sentry).
- `errorBoundary` вокруг `<AppRoutes />`.
- Переосмыслить именование `removeExcludeRoles`.
- Описать префикс `pp` в README.

### Стратегическое решение

- Если в рабочем проекте нужен subject-level (owner-based) authorization — взять CASL параллельно. Не пытаться вкрутить в текущую матрицу.
- При >5 ролях — ввести иерархию: `type Role = { name: string; inherits?: Role[] }`, раскрывать при `setPermissions`.

---

## Verification

Всё, что перечислено в «Сделано», проверено `npm run build` (tsc + vite build). Для полной верификации рабочих сценариев:

- `npm run dev` — зайти на `/dashboard`, `/orders`, `/admin` под разными мок-ролями.
- Ручной: при первом рендере UI показывает `Loading…`, а не редирект.
- Ручной: пользователь без доступа к `/orders` (и с доступом к `/dashboard`) — редирект на дашборд.
- Ручной: пользователь, которому недоступен ни текущий путь, ни `redirectTo` — видит «403», не зацикливается.
- Ручной: domain-фильтрация — форма с `useOrderFormConfig('archive')` показывает только `action_archive_restore` + `action_basic_view` (остальные не в `allowedIn`).

---

## Ключевые файлы (для справки при следующих правках)

- `src/permissions/types.ts` — `Action`, `UserContext`, `PolicyFn`, `CanFn`
- `src/permissions/usePermissions.ts` — строго типизированный `can`
- `src/permissions/resolver.ts` — `resolvePermission` (нужен dev-warning)
- `src/access/types.ts` — `AccessGatedItem`, `AccessOverride<T>`
- `src/access/accessible.ts` — `filterByPolicy`, `filterByDomain`, `filterAccessible`
- `src/access/overrides.ts` — `applyOverrides<T>`
- `src/access/resolve.ts` — `resolveGatedItems<T>` (композиция filter + overrides)
- `src/access/strip.ts` — `stripAccessFields<T>`
- `src/accessMatrix/types.ts` — `AccessRule`, `ExtendedAccess`
- `src/accessMatrix/resolveAccess.ts` — главный резолвер матрицы
- `src/accessMatrix/validateAccess.ts` — нужно расширить
- `src/accessMatrix/taskTypeAccess.ts` — 17 boundary cases
- `src/utils/optionUtils.ts` — `MasterOption extends AccessGatedItem`, `OptionTransform`, `resolveSelectOptions(… , domain?)` как тонкая обёртка над примитивами
- `src/forms/order/resolvers/resolveOrderOptions.ts` — пример использования domain
- `src/forms/order/useOrderFormConfig.ts` — пробрасывает `domain` сверху
- `src/store/permissionsStore.ts` — `initialized`, нужен reset + runtime-валидация
- `src/routes/ProtectedRoute.tsx` — loader + loop protection
