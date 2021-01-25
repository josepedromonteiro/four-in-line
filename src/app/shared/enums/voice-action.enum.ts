export enum VoiceActionEnum {
    START, COLUMN
}

export interface VoiceAction {
    action: VoiceActionEnum
    value: string|number
}
