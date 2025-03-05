from telegram import ReplyKeyboardMarkup, KeyboardButton, Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, CallbackContext

# Start function that displays the main menu
async def start(update: Update, context: CallbackContext):
    user = update.message.from_user
    welcome_text = 'Welcome to our random message selling service for your tokens on Pump.fun!'

    # Define the options keyboard
    keyboard = [
        [KeyboardButton('View Prices')],
        [KeyboardButton('Request Demo')],
        [KeyboardButton('Make a Purchase')],
        [KeyboardButton('Send Payment Proof')],
    ]
    markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=False, resize_keyboard=True)

    # Send the welcome message with the options
    await update.message.reply_text(welcome_text, reply_markup=markup)

# Function to handle menu options
async def handle_option(update: Update, context: CallbackContext):
    text = update.message.text
    if text == 'View Prices':
        # Show the prices with progressive discount
        await update.message.reply_text(get_pricing_info())
    elif text == 'Request Demo':
        # Instructions to request a demo
        await update.message.reply_text('Please contact this user to receive your demo: https://t.me/pumpfuntools2025')
    elif text == 'Make a Purchase':
        # Show the wallet for USDT TRC20 payment
        wallet_info = '''Thank you for your interest in purchasing. Please make your payment in USDT TRC20.

        Wallet Address:
        `asha8f798sa7f98sf8as7f897asf89`

        Once payment is done, select "Send Payment Proof" to complete the transaction.
        '''
        await update.message.reply_text(wallet_info)
    elif text == 'Send Payment Proof':
        # Request the payment proof
        await update.message.reply_text('Please send your TXid, Pump.fun token, and the amount purchased.\n'
                                        'Example: TXid: <your_txid>, Token: <token>, Amount: <amount>')

    # After each response, show the menu again
    await show_menu(update)

# Function to always show the menu after each response
async def show_menu(update: Update):
    keyboard = [
        [KeyboardButton('View Prices')],
        [KeyboardButton('Request Demo')],
        [KeyboardButton('Make a Purchase')],
        [KeyboardButton('Send Payment Proof')],
    ]
    markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=False, resize_keyboard=True)
    await update.message.reply_text('What would you like to do next?', reply_markup=markup)

# Function to generate prices with progressive discounts
def get_pricing_info():
    prices = []
    base_price = 5  # Base price for 10 messages
    for i in range(1, 11):
        num_messages = i * 10  # Messages in increments of 10
        discount_price = base_price * num_messages / 10  # Apply discount for quantity
        prices.append(f'{num_messages} Messages: ${discount_price:.2f}')

    pricing_text = 'Here are our prices with discounts:\n'
    pricing_text += '\n'.join(prices) + '\n\nBuy now and get more for less!'
    return pricing_text

# Main function to initialize the bot
def main():
    # Create the bot application
    application = Application.builder().token("8160217337:AAHhdDaVTJjGzxJ_81Elw7tDlMjKoXOgD48").build()

    # Add the command handler
    application.add_handler(CommandHandler("start", start))

    # Add the message handler for the menu options
    application.add_handler(MessageHandler(filters.TEXT, handle_option))

    # Start the bot
    application.run_polling()

if __name__ == '__main__':
    main()
