/**
 * Death Screen Tests - 7-Stage Death Flow
 */
import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import DeathScreen from './death';

// Mock WipeManager
const mockExecuteWipe = jest.fn().mockResolvedValue({
    success: true,
    timestamp: Date.now(),
    reason: 'IH_ZERO',
    tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
    nextScreen: 'onboarding',
});

jest.mock('../src/core/identity/WipeManager', () => ({
    WipeManager: jest.fn().mockImplementation(() => ({
        executeWipe: mockExecuteWipe,
    })),
}));

// Mock IdentityEngine
const mockSetCurrentIH = jest.fn().mockResolvedValue(undefined);
jest.mock('../src/core/identity/IdentityEngine', () => ({
    IdentityEngine: {
        getInstance: jest.fn().mockResolvedValue({
            setCurrentIH: mockSetCurrentIH,
            useInsurance: jest.fn().mockResolvedValue(undefined),
            checkHealth: jest.fn().mockResolvedValue({ health: 100, isDead: false }),
        }),
        resetInstance: jest.fn(),
    },
}));

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({
        replace: mockReplace,
    }),
}));

// Mock getDB
jest.mock('../src/database/client', () => ({
    getDB: jest.fn().mockReturnValue({
        getFirstAsync: jest.fn(),
        getAllAsync: jest.fn(),
        runAsync: jest.fn(),
        execAsync: jest.fn(),
    }),
}));

// Mock HapticEngine
jest.mock('../src/core/HapticEngine', () => ({
    HapticEngine: {
        acceleratingHeartbeat: jest.fn().mockResolvedValue(jest.fn()),
        insuranceOffer: jest.fn().mockResolvedValue(undefined),
        insurancePurchase: jest.fn().mockResolvedValue(undefined),
        punishFailure: jest.fn(),
        lightClick: jest.fn(),
    },
}));

// Mock insurance modules
const mockCreateBackup = jest.fn().mockResolvedValue(true);
const mockCheckEligibility = jest.fn().mockResolvedValue({ eligible: false });
const mockGetTotalPurchaseCount = jest.fn().mockResolvedValue(0);
const mockApplyInsurance = jest.fn().mockResolvedValue(true);
const mockGetProduct = jest.fn().mockResolvedValue(null);
const mockPurchase = jest.fn().mockResolvedValue({ success: false, error: 'cancelled' });
const mockFinishTransaction = jest.fn().mockResolvedValue(undefined);
const mockIsAvailable = jest.fn().mockReturnValue(false);

jest.mock('../src/core/insurance', () => ({
    IdentityBackupManager: {
        createBackup: (...args: any[]) => mockCreateBackup(...args),
        hasBackup: jest.fn().mockResolvedValue(false),
        clearBackup: jest.fn().mockResolvedValue(undefined),
    },
    InsuranceManager: {
        checkEligibility: (...args: any[]) => mockCheckEligibility(...args),
        getTotalPurchaseCount: (...args: any[]) => mockGetTotalPurchaseCount(...args),
        applyInsurance: (...args: any[]) => mockApplyInsurance(...args),
    },
    IAPService: {
        getInstance: jest.fn().mockReturnValue({
            isAvailable: (...args: any[]) => mockIsAvailable(...args),
            getProduct: (...args: any[]) => mockGetProduct(...args),
            purchase: (...args: any[]) => mockPurchase(...args),
            finishTransaction: (...args: any[]) => mockFinishTransaction(...args),
        }),
    },
}));

// Mock InsuranceModal as a simple component that renders testable elements
jest.mock('../src/ui/screens/InsuranceModal', () => ({
    InsuranceModal: ({ visible, countdownSeconds, onPurchase, onDecline, headerElement }: any) => {
        const { View, Text, TouchableOpacity } = require('react-native');
        if (!visible) return null;
        return (
            <View testID="insurance-modal">
                {headerElement}
                <Text testID="insurance-countdown">{countdownSeconds}</Text>
                <TouchableOpacity testID="insurance-purchase-btn" onPress={onPurchase}>
                    <Text>Purchase</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="insurance-decline-btn" onPress={onDecline}>
                    <Text>Decline</Text>
                </TouchableOpacity>
            </View>
        );
    },
}));

// Mock FileDeleteAnimation
jest.mock('../src/ui/effects/FileDeleteAnimation', () => ({
    FileDeleteAnimation: ({ files }: { files: string[] }) => {
        const { View, Text } = require('react-native');
        return (
            <View testID="file-delete-animation">
                {files.map((f: string) => (
                    <Text key={f}>DELETE: {f}</Text>
                ))}
            </View>
        );
    },
}));

describe('Death Screen - 7-Stage System', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        mockCreateBackup.mockResolvedValue(true);
        mockCheckEligibility.mockResolvedValue({ eligible: false });
        mockGetTotalPurchaseCount.mockResolvedValue(0);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should render SENTENCING stage after BACKUP completes', async () => {
        const { getByText } = render(<DeathScreen />);

        // BACKUP is instant and invisible (returns null)
        // After backup resolves, it moves to SENTENCING
        await waitFor(() => {
            expect(getByText('You are dead.')).toBeDefined();
        });

        expect(mockCreateBackup).toHaveBeenCalled();
    });

    it('should call IdentityBackupManager.createBackup on mount', async () => {
        render(<DeathScreen />);

        await waitFor(() => {
            expect(mockCreateBackup).toHaveBeenCalledTimes(1);
        });
    });

    it('should check insurance eligibility after backup', async () => {
        render(<DeathScreen />);

        await waitFor(() => {
            expect(mockCheckEligibility).toHaveBeenCalledTimes(1);
        });
    });

    it('should transition to WIPING_VISUAL stage after 2 seconds', async () => {
        const { getByText } = render(<DeathScreen />);

        // Wait for SENTENCING
        await waitFor(() => {
            expect(getByText('You are dead.')).toBeDefined();
        });

        // Advance 2s for SENTENCING duration
        act(() => {
            jest.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(getByText('EXECUTING WIPE...')).toBeDefined();
        });
    });

    it('should show progress bar in WIPING_VISUAL stage', async () => {
        const { getByText, getByTestId } = render(<DeathScreen />);

        await waitFor(() => {
            expect(getByText('You are dead.')).toBeDefined();
        });

        act(() => {
            jest.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(getByTestId('death-progress-bar')).toBeDefined();
        });
    });

    it('should show file deletion animation in WIPING_VISUAL stage', async () => {
        const { getByText, getByTestId } = render(<DeathScreen />);

        await waitFor(() => {
            expect(getByText('You are dead.')).toBeDefined();
        });

        act(() => {
            jest.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(getByTestId('file-delete-animation')).toBeDefined();
        });
    });

    it('should skip INSURANCE_OFFER and go to FINAL_WIPE when not eligible', async () => {
        mockCheckEligibility.mockResolvedValue({ eligible: false });
        const { getByText } = render(<DeathScreen />);

        // Wait for SENTENCING
        await waitFor(() => {
            expect(getByText('You are dead.')).toBeDefined();
        });

        // Advance 2s (SENTENCING) + 3s (WIPING_VISUAL)
        act(() => {
            jest.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(getByText('EXECUTING WIPE...')).toBeDefined();
        });

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        // Should go directly to FINAL_WIPE and execute wipe
        await waitFor(() => {
            expect(mockExecuteWipe).toHaveBeenCalledWith('IH_ZERO', 0);
        });
    });

    it('should show INSURANCE_OFFER when eligible', async () => {
        mockCheckEligibility.mockResolvedValue({ eligible: true });
        mockIsAvailable.mockReturnValue(true);
        mockGetProduct.mockResolvedValue({
            productId: 'test_product',
            localizedPrice: '¥1,500',
            currency: 'JPY',
            priceAmount: 1500,
        });

        const { getByTestId, getByText } = render(<DeathScreen />);

        // Wait for SENTENCING
        await waitFor(() => {
            expect(getByText('You are dead.')).toBeDefined();
        });

        // Advance through SENTENCING (2s) + WIPING_VISUAL (3s)
        act(() => {
            jest.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(getByText('EXECUTING WIPE...')).toBeDefined();
        });

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        await waitFor(() => {
            expect(getByTestId('insurance-modal')).toBeDefined();
        });
    });

    it('should show countdown in INSURANCE_OFFER stage', async () => {
        mockCheckEligibility.mockResolvedValue({ eligible: true });

        const { getByTestId, getByText } = render(<DeathScreen />);

        await waitFor(() => {
            expect(getByText('You are dead.')).toBeDefined();
        });

        act(() => {
            jest.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(getByText('EXECUTING WIPE...')).toBeDefined();
        });

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        await waitFor(() => {
            expect(getByTestId('insurance-countdown')).toBeDefined();
        });
    });

    it('should trigger FINAL_WIPE when decline is pressed', async () => {
        mockCheckEligibility.mockResolvedValue({ eligible: true });

        const { getByTestId, getByText } = render(<DeathScreen />);

        await waitFor(() => {
            expect(getByText('You are dead.')).toBeDefined();
        });

        act(() => {
            jest.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(getByText('EXECUTING WIPE...')).toBeDefined();
        });

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        await waitFor(() => {
            expect(getByTestId('insurance-decline-btn')).toBeDefined();
        });

        // Press decline
        await act(async () => {
            fireEvent.press(getByTestId('insurance-decline-btn'));
        });

        // Should execute wipe after declining
        await waitFor(() => {
            expect(mockExecuteWipe).toHaveBeenCalledWith('IH_ZERO', 0);
        });
    });

    it('should show VOID stage with farewell text after wipe', async () => {
        mockCheckEligibility.mockResolvedValue({ eligible: false });
        const { getByText } = render(<DeathScreen />);

        // Wait for SENTENCING
        await waitFor(() => {
            expect(getByText('You are dead.')).toBeDefined();
        });

        // SENTENCING (2s)
        act(() => {
            jest.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(getByText('EXECUTING WIPE...')).toBeDefined();
        });

        // WIPING_VISUAL (3s)
        act(() => {
            jest.advanceTimersByTime(3000);
        });

        // Wait for wipe to execute
        await waitFor(() => {
            expect(mockExecuteWipe).toHaveBeenCalled();
        });

        // Advance 500ms for FINAL_WIPE -> VOID transition
        act(() => {
            jest.advanceTimersByTime(500);
        });

        await waitFor(() => {
            expect(getByText('Welcome back to the old you.')).toBeDefined();
        });
    });

    it('should navigate to onboarding after VOID stage', async () => {
        mockCheckEligibility.mockResolvedValue({ eligible: false });
        const { getByText } = render(<DeathScreen />);

        // Wait for SENTENCING
        await waitFor(() => {
            expect(getByText('You are dead.')).toBeDefined();
        });

        // SENTENCING (2s) + WIPING_VISUAL (3s)
        act(() => {
            jest.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(getByText('EXECUTING WIPE...')).toBeDefined();
        });

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        // Wait for wipe
        await waitFor(() => {
            expect(mockExecuteWipe).toHaveBeenCalled();
        });

        // FINAL_WIPE -> VOID (500ms) + VOID -> navigate (1000ms)
        act(() => {
            jest.advanceTimersByTime(500);
        });

        await waitFor(() => {
            expect(getByText('Welcome back to the old you.')).toBeDefined();
        });

        act(() => {
            jest.advanceTimersByTime(1000);
        });

        await waitFor(() => {
            expect(mockReplace).toHaveBeenCalledWith('/onboarding');
        });
    });

    it('should not skip insurance eligibility check when backup fails', async () => {
        mockCreateBackup.mockResolvedValue(false);

        render(<DeathScreen />);

        await waitFor(() => {
            expect(mockCreateBackup).toHaveBeenCalled();
        });

        // Should NOT call checkEligibility when backup fails
        expect(mockCheckEligibility).not.toHaveBeenCalled();
    });
});
