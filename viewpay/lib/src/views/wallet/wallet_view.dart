import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../providers/wallet_provider.dart';

class WalletView extends ConsumerStatefulWidget {
  const WalletView({super.key});

  @override
  ConsumerState<WalletView> createState() => _WalletViewState();
}

class _WalletViewState extends ConsumerState<WalletView> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  
  // Method specific controllers
  final _phoneController = TextEditingController();
  final _paypalEmailController = TextEditingController();
  final _bankHolderController = TextEditingController();
  final _bankAccountController = TextEditingController();
  final _bankNameController = TextEditingController();

  String _selectedMethod = 'mpesa'; // mpesa, paypal, bank

  void _submitWithdrawal() async {
    final wallet = ref.read(walletStateProvider);
    if (wallet.kycStatus != 'approved') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('KYC verification is required before processing payouts.'),
          backgroundColor: Colors.amber,
        ),
      );
      return;
    }

    if (_formKey.currentState!.validate()) {
      final amount = double.tryParse(_amountController.text) ?? 0.0;
      
      Map<String, dynamic> details = {};
      if (_selectedMethod == 'mpesa') {
        details = {'phone_number': _phoneController.text.trim()};
      } else if (_selectedMethod == 'paypal') {
        details = {'paypal_email': _paypalEmailController.text.trim()};
      } else {
        details = {
          'holder_name': _bankHolderController.text.trim(),
          'account_number': _bankAccountController.text.trim(),
          'bank_name': _bankNameController.text.trim(),
        };
      }

      final success = await ref.read(walletStateProvider.notifier).requestCashout(
        amount: amount,
        method: _selectedMethod,
        details: details,
      );

      if (success && mounted) {
        _amountController.clear();
        _phoneController.clear();
        _paypalEmailController.clear();
        _bankAccountController.clear();
        _bankHolderController.clear();
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Withdrawal request submitted for review!'),
            backgroundColor: Colors.green,
          ),
        );
      } else if (mounted) {
        final err = ref.read(walletStateProvider).errorMessage;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(err ?? 'Failed to submit withdrawal request.'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final wallet = ref.watch(walletStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Wallet Ledger', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0F172A),
      ),
      backgroundColor: const Color(0xFF0F172A),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Balance display card
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.06)),
                ),
                child: Column(
                  children: [
                    const Text('WITHDRAWABLE CASH BALANCE', style: TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text(
                      '\$${wallet.balance.toStringAsFixed(4)}',
                      style: GoogleFonts.outfit(fontSize: 38, fontWeight: FontWeight.w900, color: const Color(0xFF38BDF8)),
                    ),
                    const SizedBox(height: 12),
                    const Divider(color: Colors.white10),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('KYC Identity Status:', style: TextStyle(color: Colors.grey, fontSize: 12)),
                        Text(
                          wallet.kycStatus.toUpperCase(),
                          style: TextStyle(
                            color: wallet.kycStatus == 'approved' ? Colors.green : Colors.amber,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Withdrawal form
              Text('Request Payout', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              
              DropdownButtonFormField<String>(
                value: _selectedMethod,
                dropdownColor: const Color(0xFF1E293B),
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Payout Option',
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                items: const [
                  DropdownMenuItem(value: 'mpesa', child: Text('M-Pesa Mobile Pay')),
                  DropdownMenuItem(value: 'paypal', child: Text('PayPal Account')),
                  DropdownMenuItem(value: 'bank', child: Text('Bank Wire Transfer')),
                ],
                onChanged: (val) {
                  setState(() {
                    _selectedMethod = val ?? 'mpesa';
                  });
                },
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Cash Amount (\$ USD)',
                  prefixIcon: const Icon(Icons.attach_money, color: Colors.grey),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (val) {
                  final amt = double.tryParse(val ?? '') ?? 0.0;
                  if (amt < 10.0) {
                    return 'Minimum cashout amount is \$10.00';
                  }
                  if (amt > wallet.balance) {
                    return 'Amount exceeds your withdrawable balance';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Expandable parameters conditional UI
              if (_selectedMethod == 'mpesa') ...[
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'M-Pesa Phone Number',
                    prefixIcon: const Icon(LucideIcons.phone, color: Colors.grey),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (val) {
                    if (val == null || val.isEmpty) return 'Enter target phone number';
                    return null;
                  },
                ),
              ] else if (_selectedMethod == 'paypal') ...[
                TextFormField(
                  controller: _paypalEmailController,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'PayPal Registered Email',
                    prefixIcon: const Icon(LucideIcons.mail, color: Colors.grey),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (val) {
                    if (val == null || !val.contains('@')) return 'Enter valid PayPal email';
                    return null;
                  },
                ),
              ] else ...[
                TextFormField(
                  controller: _bankNameController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Bank Name',
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _bankHolderController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Account Holder Name',
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _bankAccountController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Account Number',
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                ),
              ],
              
              const SizedBox(height: 24),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF38BDF8),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: wallet.isLoading ? null : _submitWithdrawal,
                child: wallet.isLoading 
                    ? const CircularProgressIndicator(color: Colors.black)
                    : const Text('Process Cashout Request', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              
              const SizedBox(height: 36),
              
              // Withdrawal Payout history logs
              Text('Withdrawal History Logs', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              wallet.withdrawals.isEmpty
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(20.0),
                        child: Text('No cashouts requested yet.', style: TextStyle(color: Colors.grey)),
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: wallet.withdrawals.length,
                      itemBuilder: (context, idx) {
                        final w = wallet.withdrawals[idx];
                        return Card(
                          color: const Color(0xFF1E293B),
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ListTile(
                            title: Text(
                              'Payout Method: ${w['payment_method']?.toString().toUpperCase()}',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            subtitle: Text('Requested: ${w['created_at'].toString().split('T')[0]}', style: const TextStyle(fontSize: 11)),
                            trailing: Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('\$${w['net_amount']}', style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Text(
                                  w['status']?.toString().toUpperCase() ?? 'PENDING',
                                  style: TextStyle(
                                    color: w['status'] == 'completed' ? Colors.green : Colors.amber,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
