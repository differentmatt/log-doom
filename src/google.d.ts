declare namespace google.accounts.id {
  interface CredentialResponse {
    credential: string
    select_by: string
  }

  interface IdConfiguration {
    client_id: string
    callback: (response: CredentialResponse) => void
    auto_select?: boolean
    itp_support?: boolean
  }

  interface GsiButtonConfiguration {
    type: 'standard' | 'icon'
    theme?: 'outline' | 'filled_blue' | 'filled_black'
    size?: 'large' | 'medium' | 'small'
    shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  }

  interface PromptMomentNotification {
    isDisplayMoment(): boolean
    isDisplayed(): boolean
    isNotDisplayed(): boolean
    getNotDisplayedReason(): string
    isSkippedMoment(): boolean
    getSkippedReason(): string
    isDismissedMoment(): boolean
    getDismissedReason(): string
  }
}

// Runtime global — needed so `typeof google !== 'undefined'` compiles
// eslint-disable-next-line no-var
declare var google: {
  accounts: {
    id: {
      initialize(config: google.accounts.id.IdConfiguration): void
      prompt(
        momentListener?: (notification: google.accounts.id.PromptMomentNotification) => void,
      ): void
      disableAutoSelect(): void
      renderButton(
        parent: HTMLElement,
        options: google.accounts.id.GsiButtonConfiguration,
      ): void
    }
  }
}
